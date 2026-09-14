# Polyfills II: new, instanceof, Object.create, Object.assign, Array.prototype.flat

## Problem statement
J27 covered the array methods and `this` binding. This round is about the **prototype chain and property semantics**, and it's just as common. BFE.dev's `Array.prototype.flat` question alone has more than 27 000 solves, and "implement `new`" and "implement `instanceof`" are standard follow-ups once an interviewer sees you know `bind`.

Implement five **standalone functions** and export them from `Solution.ts`. Nothing global is patched:

| Yours | Native equivalent |
|---|---|
| `myNew(Ctor, ...args)` | `new Ctor(...args)` |
| `myInstanceOf(obj, Ctor)` | `obj instanceof Ctor` |
| `myObjectCreate(proto, props?)` | `Object.create(proto, props)` |
| `myObjectAssign(target, ...sources)` | `Object.assign(target, ...sources)` |
| `myFlat(arr, depth = 1)` | `arr.flat(depth)` |

## Clarifying questions to ask
- Can `myNew` use my `myObjectCreate`? *(Yes. Building on your own functions is fine.)*
- Does `myNew` need to support ES `class` constructors? *(No. Classes can't be called without `new`. Only plain constructor functions are tested. See follow-up 2.)*
- What does `myNew` do if the constructor returns something? *(The same as `new`: an object or function return value replaces the new instance, and a primitive return value is ignored.)*
- Should `myInstanceOf` honour `Symbol.hasInstance`? *(Not in the base version. It's follow-up 1.)*
- Does `myInstanceOf` treat primitives like their wrapper objects, e.g. `1` and `Number`? *(No. A primitive is never an instance of anything, just like with `instanceof`.)*
- Must `myObjectCreate(null)` really have no prototype? *(Yes. `'toString' in obj` must be `false`.)*
- Does `myObjectAssign` copy getters as getters? *(No. Like `Object.assign`, it reads the value through the getter and writes it with a normal assignment, which triggers setters on the target.)*
- How does `myFlat` treat holes? *(Like `flat`: holes in any array that gets flattened are removed, even with `depth = 0`. `undefined` values are kept.)*

## Functional requirements
### myNew
- [ ] Creates a new object whose prototype is `Ctor.prototype`, then calls `Ctor` with `this` set to that object and the given arguments.
- [ ] If `Ctor` returns an object or a function, that value is the result. Otherwise (a primitive, `null` or `undefined`) the new object is the result.
- [ ] If `Ctor.prototype` is not an object (e.g. it was set to `null`), the new object's prototype is `Object.prototype`.
- [ ] Throws a `TypeError` if `Ctor` is not a function.

### myInstanceOf
- [ ] Returns `true` if `Ctor.prototype` appears anywhere in `obj`'s prototype chain, otherwise `false`.
- [ ] Returns `false` for primitives, `null` and `undefined`, without throwing.
- [ ] Works for objects with a `null` prototype, e.g. `myInstanceOf(Object.create(null), Object)` is `false`.
- [ ] Throws a `TypeError` if `Ctor` is not a function, or if `Ctor.prototype` is not an object (e.g. an arrow function).

### myObjectCreate
- [ ] Returns a new object whose prototype is `proto`. `proto` may be any object (functions included) or `null`.
- [ ] With `proto = null`, the object has no prototype at all.
- [ ] If `props` is given, defines those properties with `Object.defineProperties` semantics: unspecified attributes default to `false`, and accessors work.
- [ ] Throws a `TypeError` if `proto` is neither an object nor `null`, or if `props` is `null`.

### myObjectAssign
- [ ] Copies every **own enumerable** property of each source to `target`, left to right, and returns `target`. Later sources win.
- [ ] Copies symbol-keyed properties as well as string keys.
- [ ] Skips inherited and non-enumerable properties.
- [ ] Reads source values with a normal `[[Get]]`, so getters run, and writes with a normal assignment, so setters on `target` run.
- [ ] Skips `null` and `undefined` sources. A string source contributes its indexed characters. Numbers and booleans contribute nothing.
- [ ] A primitive `target` is converted to its wrapper object. A `null` or `undefined` target throws a `TypeError`.
- [ ] Writing to a read-only property on `target` throws a `TypeError`, like the native method in strict mode.

### myFlat
- [ ] Returns a new array flattened `depth` levels deep. The default depth is `1`, and `Infinity` flattens everything.
- [ ] `depth` values of `0`, negative numbers or `NaN` don't flatten nested arrays, but holes are still removed.
- [ ] Holes are removed from every array that gets flattened. `undefined` and `null` values are kept.
- [ ] Only real arrays (`Array.isArray`) are flattened. Array-likes and strings are items.
- [ ] Doesn't mutate the input.

## Non-functional requirements
- Don't modify any built-in prototype or the inputs, except `target` in `myObjectAssign`.
- `myFlat` is O(total elements). `myInstanceOf` is O(prototype chain length).
- Only the error type matters, not the message.

## Constraints
- 40 minutes.
- Banned: `new` inside `myNew`; `instanceof` and `isPrototypeOf` inside `myInstanceOf`; `Object.create` anywhere; `Object.assign` and object spread inside `myObjectAssign`; `flat` and `flatMap` anywhere; any `Reflect.*` method.
- `Object.setPrototypeOf` may be used **only** in `myObjectCreate`, and only for the `null`-prototype case. Be ready to explain why that case needs it.
- Allowed: `Object.getPrototypeOf`, `Object.keys`, `Object.getOwnPropertySymbols`, `Object.defineProperties`, `Object.prototype.propertyIsEnumerable`, `Array.isArray`, loops and the `in` operator.
- Export every function from `Solution.ts`.

## Data / API contract
```ts
type AnyFn = (this: any, ...args: any[]) => any;
type NestedArray<T> = Array<T | NestedArray<T>>;

function myNew(Ctor: AnyFn, ...args: unknown[]): any;
function myInstanceOf(obj: unknown, Ctor: unknown): boolean;
function myObjectCreate(proto: object | null, props?: PropertyDescriptorMap): any;
function myObjectAssign(target: unknown, ...sources: unknown[]): any;
function myFlat<T>(arr: readonly (T | NestedArray<T>)[], depth?: number): Array<T | NestedArray<T>>;
function myFlatMap<T, U>(                                            // follow-up 3
  arr: readonly T[],
  cb: (value: T, index: number, array: readonly T[]) => U | readonly U[],
  thisArg?: unknown,
): U[];
```

## Test contract
- The functions are imported as named exports. Tests never patch prototypes.
- Prototypes are checked with `Object.getPrototypeOf`. "No prototype" is checked with `Object.getPrototypeOf(obj) === null` and `'toString' in obj === false`.
- Descriptors are checked with `Object.getOwnPropertyDescriptor`.
- Holes are built by assigning to indexes (`a[0] = 1; a[2] = 3`) and checked with the `in` operator or by comparing `length`.
- Invalid-argument tests check `toThrow(TypeError)`.
- Follow-up tests (`npm run test:followups -- j44`) check `Symbol.hasInstance` support in `myInstanceOf` and `myFlatMap`.

## Edge cases
- A constructor that returns `this` explicitly, or returns a function.
- `myInstanceOf` with a bound function as `Ctor`. Native `instanceof` uses the target function's prototype.
- `myInstanceOf` when `Ctor.prototype` is reassigned after the object was created.
- `myObjectCreate(Object.prototype)` must behave like `{}`.
- `myObjectAssign` where a getter on a source throws halfway through: properties copied before the throw stay on `target`.
- `myObjectAssign(target, source)` where `source` is a `Proxy`.
- `myFlat([[1, [2]], , [3]], Infinity)` → `[1, 2, 3]`.

## Follow-ups
1. **`Symbol.hasInstance`.** Make `myInstanceOf` check `Ctor[Symbol.hasInstance]` first, like the real operator. If it's a method, return its result coerced to a boolean. This also allows non-function objects as `Ctor`, e.g. `const Even = { [Symbol.hasInstance]: (n) => n % 2 === 0 }`. Take care: every function inherits a default `Symbol.hasInstance` from `Function.prototype`. How do you avoid calling the native one?
2. **Classes and `new.target`.** Why does `myNew(class A {})` throw? What does `new.target` give a constructor, and how would you write `myNew` with `Reflect.construct`? Which parts of real `new` can't be polyfilled at all?
3. **flatMap.** Implement `myFlatMap(arr, cb, thisArg)`. It maps each present element with `cb(value, index, array)` (with `this === thisArg`) and flattens the results **one** level. Only real arrays returned by `cb` are spread. Holes in `arr` are skipped.
4. **Copying accessors.** Write `completeAssign(target, ...sources)`, which copies getters and setters as accessors instead of evaluating them. When would you need it, e.g. for mixins or for copying an object with a lazy getter?

## Concepts covered
`[[Prototype]]` and the prototype chain · the four steps of `new` · `Symbol.hasInstance` · property descriptors and attribute defaults · own vs inherited and enumerable vs non-enumerable keys · `[[Get]]`/`[[Set]]` vs `defineProperty` · symbol keys · holes vs `undefined`.

Related: J27 Polyfills · J26 flatten, get & classnames · S29 deepClone & deepEqual.
