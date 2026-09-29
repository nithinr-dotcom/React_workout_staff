import type { AnyFn, MapCallback, Predicate, Reducer } from "./types";

// Rules: no native map/filter/reduce/forEach/call/apply/bind and no Reflect.apply.
// Plain loops, `in`, Symbol, spread and Object are fine.

function assertFunction(value: unknown, name: string): void {
  if (typeof value !== "function") {
    throw new TypeError(`${name}: ${String(value)} is not a function`);
  }
}

// ---------- array methods ----------

export function myMap<T, U>(arr: readonly T[], cb: MapCallback<T, U>, thisArg?: unknown): U[] {
  assertFunction(cb, "myMap");
  // 1. Read the length ONCE, like the spec. Elements the callback pushes are not visited,
  //    and this also works for array-likes such as { 0: "a", length: 1 }.
  const len = arr.length;
  // 2. new Array(len) starts as `len` holes. We only fill indexes that exist in
  //    the input, so holes in the input stay holes in the result.
  const result = new Array<U>(len);
  for (let i = 0; i < len; i++) {
    // 3. `i in arr` is true for a real element (even one that is `undefined`),
    //    false for a hole. `arr[i] !== undefined` would get that wrong.
    if (i in arr) {
      result[i] = myCall(cb, thisArg, arr[i], i, arr);
    }
  }
  return result;
}

export function myFilter<T>(arr: readonly T[], cb: Predicate<T>, thisArg?: unknown): T[] {
  assertFunction(cb, "myFilter");
  const len = arr.length;
  const result: T[] = []; // dense: we push, so the result never has holes
  for (let i = 0; i < len; i++) {
    if (!(i in arr)) continue; // skip holes
    const value = arr[i]; // read once, in case the callback changes the array
    if (myCall(cb, thisArg, value, i, arr)) result.push(value);
  }
  return result;
}

export function myReduce<T, A = T>(arr: readonly T[], cb: Reducer<T, A>, initialValue?: A): A {
  assertFunction(cb, "myReduce");
  const len = arr.length;
  let i = 0;
  let acc: A;

  // 4. "Was an initial value passed?" is NOT the same as "is it undefined?".
  //    `[].reduce(cb, undefined)` has an initial value. Only the argument count can tell.
  //    (`arguments` works because this is a normal function, not an arrow function.)
  if (arguments.length >= 3) {
    acc = initialValue as A;
  } else {
    // 5. No initial value: the first PRESENT element (not index 0) is the start.
    while (i < len && !(i in arr)) i++;
    if (i >= len) throw new TypeError("myReduce: reduce of empty array with no initial value");
    acc = arr[i] as unknown as A;
    i++;
  }

  for (; i < len; i++) {
    if (i in arr) acc = cb(acc, arr[i], i, arr); // `this` is not used by reduce callbacks
  }
  return acc;
}

// ---------- call / apply / bind ----------

export function myCall<F extends AnyFn>(fn: F, thisArg: unknown, ...args: Parameters<F>): ReturnType<F> {
  assertFunction(fn, "myCall");

  // 6. null/undefined: a plain call. Our code runs in strict mode (ES module),
  //    so `this` inside `fn` is `undefined`, same as native call for strict functions.
  if (thisArg === null || thisArg === undefined) return fn(...args);

  // 7. THE TRICK: `obj.method()` sets `this = obj` (implicit binding).
  //    So we put `fn` on thisArg for a moment and call it as a method.
  //    - Object(thisArg) boxes primitives: 'abc' becomes a String object.
  //      Native call would pass 'abc' through unchanged (see README follow-up 4).
  //    - A fresh Symbol can't clash with any existing key, and `fn` can't know it.
  //    - defineProperty without `enumerable` makes it hidden from for…in / Object.keys.
  //    - A frozen thisArg can't take the property, so this throws a TypeError. That is
  //      the known limit of this approach without the native call/apply/Reflect.
  const ctx = Object(thisArg) as Record<symbol, AnyFn>;
  const key = Symbol("myCall");
  Object.defineProperty(ctx, key, { value: fn, configurable: true });
  try {
    return ctx[key](...args);
  } finally {
    // 8. `finally` runs even if `fn` throws, so thisArg is always left as we found it.
    delete ctx[key];
  }
}

export function myApply<F extends AnyFn>(fn: F, thisArg: unknown, args?: Parameters<F> | null): ReturnType<F> {
  assertFunction(fn, "myApply");
  // 9. Same as call, but the arguments come as one array. null/undefined → no arguments.
  const list = (args ?? []) as Parameters<F>;
  return myCall(fn, thisArg, ...list);
}

export function myBind(fn: AnyFn, thisArg: unknown, ...boundArgs: unknown[]): AnyFn {
  // 10. Check at bind time, not later when the bound function is called.
  assertFunction(fn, "myBind");

  // 11. A closure remembers `fn`, `thisArg` and `boundArgs`. The `this` the bound
  //     function is called with is ignored, so `other.read()` still uses thisArg.
  //     Binding a bound function works too: the inner one ignores the new `this`.
  return function bound(...callArgs: unknown[]) {
    const allArgs = [...boundArgs, ...callArgs]; // partial application: bound args first

    // 12. Follow-up 1: `new.target` is set only when called with `new`.
    //     Then we construct the original `fn` and ignore the bound `this`,
    //     like native bind does. The object we return becomes the result of `new`.
    if (new.target) {
      const Ctor = fn as unknown as new (...a: unknown[]) => unknown;
      return new Ctor(...allArgs);
    }
    return myApply(fn, thisArg, allArgs);
  };
}
