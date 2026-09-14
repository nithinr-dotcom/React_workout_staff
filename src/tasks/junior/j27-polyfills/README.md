# Polyfills: map, filter, reduce, bind, call, apply

## Problem statement
"Write a polyfill for `Array.prototype.reduce`" and "implement `Function.prototype.bind`" are asked all the time, especially in Indian product-company rounds. They check whether you really understand `this`, how array methods treat holes, and when the spec throws `TypeError`.

Implement six **standalone functions**. They take the array or function as their first argument instead of patching prototypes, so nothing global changes while you practise:

| Yours | Native equivalent |
|---|---|
| `myMap(arr, cb, thisArg?)` | `arr.map(cb, thisArg)` |
| `myFilter(arr, cb, thisArg?)` | `arr.filter(cb, thisArg)` |
| `myReduce(arr, cb, initialValue?)` | `arr.reduce(cb, initialValue?)` |
| `myCall(fn, thisArg, ...args)` | `fn.call(thisArg, ...args)` |
| `myApply(fn, thisArg, args?)` | `fn.apply(thisArg, args)` |
| `myBind(fn, thisArg, ...boundArgs)` | `fn.bind(thisArg, ...boundArgs)` |

## Clarifying questions to ask
- Can I use the native method I'm replacing, or `Reflect.apply`? *(No. You may use plain loops, `in`, `Symbol`, spread and `Object`.)*
- Can `myBind` use my `myApply`? *(Yes, building on your own functions is fine.)*
- Do I need to handle sparse arrays? *(Yes, the same way the native methods do.)*
- Do I need to support `new` on a bound function? *(Not for the base version. It's follow-up 1.)*
- What should `myCall` do with a primitive or `null` `thisArg`? *(Not tested. Explain the trade-off of your approach. See follow-up 4.)*

## Functional requirements
### myMap
- [ ] Returns a new array of the same length, with `cb(value, index, array)` results at the same indexes.
- [ ] `cb` runs with `this === thisArg`.
- [ ] Holes are not visited and stay holes in the result.
- [ ] Throws a `TypeError` if `cb` is not a function.

### myFilter
- [ ] Returns a new, dense array of the elements for which `cb(value, index, array)` returns a truthy value.
- [ ] `cb` runs with `this === thisArg`. Holes are not visited.
- [ ] Throws a `TypeError` if `cb` is not a function.

### myReduce
- [ ] With an initial value, the accumulator starts as that value and `cb` is called for every present element from index 0.
- [ ] Without an initial value, the first **present** element is the starting accumulator and `cb` starts from the next present element.
- [ ] Passing `undefined` explicitly as the third argument counts as an initial value, just like `[].reduce(cb, undefined)`.
- [ ] `cb` receives `(accumulator, value, index, array)`. Holes are skipped.
- [ ] An empty array (or one with only holes) and no initial value throws a `TypeError`. With an initial value it returns the initial value without calling `cb`.
- [ ] Throws a `TypeError` if `cb` is not a function.

### myCall / myApply
- [ ] Call `fn` with `this` set to `thisArg` and forward the arguments: a spread list for `myCall`, an array for `myApply`.
- [ ] Return whatever `fn` returns.
- [ ] `myApply` with `args` omitted, `null` or `undefined` calls `fn` with no arguments.
- [ ] Leave no visible trace on `thisArg`: its own keys, including symbol keys, are unchanged afterwards, **even if `fn` throws**.
- [ ] Throw a `TypeError` if `fn` is not a function.

### myBind
- [ ] Returns a new function. Calling it calls `fn` with `this === thisArg`, even when it's called as a method of another object.
- [ ] Bound arguments come first, followed by the call-time arguments (partial application).
- [ ] Returns what `fn` returns.
- [ ] Throws a `TypeError` immediately (at bind time) if `fn` is not a function.

## Non-functional requirements
- Don't modify `Array.prototype`, `Function.prototype` or the inputs.
- Each function is O(n) in the array length or argument count.
- Error messages don't have to match the engine's messages. Only the error type matters.

## Constraints
- 40 minutes.
- No native `map`/`filter`/`reduce`/`forEach`/`call`/`apply`/`bind` and no `Reflect.apply`.
- Export all six functions from `Solution.ts`.

## Data / API contract
```ts
type MapCallback<T, U> = (value: T, index: number, array: readonly T[]) => U;
type Predicate<T> = (value: T, index: number, array: readonly T[]) => unknown;
type Reducer<T, A> = (accumulator: A, value: T, index: number, array: readonly T[]) => A;
type AnyFn = (this: any, ...args: any[]) => any;

function myMap<T, U>(arr: readonly T[], cb: MapCallback<T, U>, thisArg?: unknown): U[];
function myFilter<T>(arr: readonly T[], cb: Predicate<T>, thisArg?: unknown): T[];
function myReduce<T, A = T>(arr: readonly T[], cb: Reducer<T, A>, initialValue?: A): A;
function myCall<F extends AnyFn>(fn: F, thisArg: unknown, ...args: Parameters<F>): ReturnType<F>;
function myApply<F extends AnyFn>(fn: F, thisArg: unknown, args?: Parameters<F> | null): ReturnType<F>;
function myBind(fn: AnyFn, thisArg: unknown, ...boundArgs: unknown[]): AnyFn;
```

## Test contract
- The functions are imported as named exports. Tests never patch prototypes.
- Sparse arrays are built by assigning to indexes, e.g. `a[0] = 1; a[2] = 3`, so index `1` is a hole. Holes are checked with the `in` operator.
- Invalid-argument tests check `toThrow(TypeError)`.
- "No visible trace" is checked by comparing `Reflect.ownKeys(thisArg)` before and after.
- Follow-up tests (`npm run test:followups -- j27`) check `new` on a bound function, and array-like inputs plus mutation during iteration.

## Edge cases
- `myReduce([, , 5], cb)` returns `5` without calling `cb`.
- A callback that pushes to the array while it's being iterated. Native methods capture the length up front.
- `myCall` when `thisArg` is frozen, or is a primitive such as `'abc'` or `42`.
- `myCall` when `fn` itself reads or deletes a property with the temporary key you used.
- Binding an already-bound function: `myBind(myBind(fn, a), b)` still uses `a`.

## Follow-ups
1. **`new` on a bound function.** `new (myBind(Point, ignored, 1))(2)` must construct a `Point` with `x = 1, y = 2`, ignore the bound `this`, and satisfy `instanceof Point`. How do you detect that you were called with `new`?
2. **Spec-accurate iteration.** Make `myMap`, `myFilter` and `myReduce` work on array-likes (`{ 0: 'a', length: 1 }`). Capture the length before iterating, so elements appended by the callback are not visited.
3. **Real polyfills.** Install `myMap` as `Array.prototype.myMap` safely. Why must it be defined with `Object.defineProperty(…, { enumerable: false })`, and what breaks in `for…in` loops if it isn't? Why should production code feature-detect before patching?
4. **`this` coercion.** Explain why a symbol-property `myCall` shows a primitive `thisArg` as a boxed object and fails for frozen objects, while native `call` in strict mode passes `'abc'` through unchanged. Is there any way to fix this without `call`, `apply` or `Reflect`?

## Concepts covered
The four `this` binding rules (default, implicit, explicit, `new`) · `Symbol` keys as collision-free temporary properties · `try/finally` cleanup · sparse arrays and the `in` operator · `arguments.length` vs `undefined` · partial application · `new.target`.

Related: J23 debounce · J24 throttle · J26 flatten, get & classnames.
