# deepClone & deepEqual

## Problem statement
Implement two utilities from scratch:

- `deepClone(value)` returns a copy of `value` that shares no mutable objects with the original. Mutating any nested part of the copy must never affect the original.
- `deepEqual(a, b)` returns `true` when two values have the same structure and contents.

Both must handle the built-ins that show up in real application state (`Date`, `RegExp`, `Map`, `Set`) and must not blow the stack on circular structures. `structuredClone` and `JSON.stringify` are off-limits: the interviewer wants to see the recursion, the type dispatch and the cycle bookkeeping.

## Clarifying questions to ask
- Which types must be supported? *(Primitives, arrays, plain objects, `Date`, `RegExp`, `Map`, `Set`. Symbol keys and class prototypes are follow-ups.)*
- What happens to functions? *(They are copied by reference. Cloning a closure isn't meaningful.)*
- Should `Map` keys be cloned? *(No. Keys are kept by reference so lookups by the same key object still work. Values are cloned deeply. `Set` elements are cloned deeply.)*
- If the same object appears twice in the input, should the copy contain one object or two? *(One. The shape of the reference graph is preserved, including cycles.)*
- Is `NaN` equal to `NaN`? Is `0` equal to `-0`? *(Yes and yes: SameValueZero semantics.)*
- Is a missing key the same as a key whose value is `undefined`? *(No. `{}` and `{ a: undefined }` are not equal.)*
- Does key order matter for objects? *(No.)*

## Functional requirements
### deepClone
- [ ] Primitives (`string`, `number` including `NaN`, `boolean`, `null`, `undefined`, `bigint`, `symbol`) are returned as-is.
- [ ] Functions are returned by reference.
- [ ] Arrays become new arrays whose elements are deep clones.
- [ ] Plain objects become new objects with the same own enumerable string keys, each value deep-cloned.
- [ ] `Date` becomes a new `Date` with the same time value.
- [ ] `RegExp` becomes a new `RegExp` with the same `source` and `flags`.
- [ ] `Map` becomes a new `Map` with the same keys (by reference) and deep-cloned values, in the same insertion order.
- [ ] `Set` becomes a new `Set` with deep-cloned elements, in the same insertion order.
- [ ] If an object is reachable more than once, the clone contains exactly one copy of it, referenced from every place the original was.
- [ ] Circular references are reproduced in the clone (`clone.self === clone`) without infinite recursion.

### deepEqual
- [ ] Primitives compare with SameValueZero: `NaN` equals `NaN`, `0` equals `-0`, and there is no type coercion (`1` is not `'1'`).
- [ ] Values of different kinds are never equal: an array is not equal to an object with the same indices, a `Date` is not equal to its timestamp number, a `Map` is not equal to a `Set`.
- [ ] Arrays are equal when they have the same length and pairwise deep-equal elements.
- [ ] Plain objects are equal when they have the same set of own enumerable string keys (order ignored) and deep-equal values.
- [ ] `Date`s are equal when their time values are equal. Two invalid dates are equal.
- [ ] `RegExp`s are equal when `source` and `flags` match.
- [ ] `Map`s are equal when they have the same size and every key of one is present in the other (looked up with `has`, i.e. by reference for object keys) with a deep-equal value.
- [ ] `Set`s are equal when they have the same size and every element of one has a deep-equal element in the other. O(n²) matching for object elements is acceptable.
- [ ] Functions are equal only if they are the same reference.
- [ ] Circular structures terminate. Two structures with the same cyclic shape and contents are equal.

## Non-functional requirements
- No libraries, no `structuredClone`, no `JSON.parse(JSON.stringify(...))`.
- Recursion depth is fine for this exercise. Mention how you'd go iterative for very deep inputs.
- Cycle tracking must not leak memory beyond the call: prefer `WeakMap` / call-scoped structures over module-level state.
- `deepClone` never mutates its input.

## Constraints
- 50 minutes.
- Export `deepClone` and `deepEqual` as named exports from `Solution.ts`. The contract lives in `types.ts`.

## Data / API contract
```ts
interface DeepModule {
  deepClone<T>(value: T): T;
  deepEqual(a: unknown, b: unknown): boolean;
}
```

## Test contract
- Tests call `deepClone` and `deepEqual` as named exports of the module.
- Clones are checked with `toBe` / `not.toBe` for identity (new containers, preserved shared and circular references) and with `toEqual` / `instanceof` for contents.
- `Map` tests use primitive keys only.
- `deepEqual` tests pass values with cycles and expect a boolean result, never a thrown `RangeError`.
- Follow-up tests (`npm run test:followups -- s29`) check own enumerable **symbol** keys in both functions.

## Edge cases
- `deepClone(null)` and `deepClone(undefined)`: `typeof null === 'object'` catches people out.
- A `Map` whose value is the `Map` itself.
- An array that contains itself.
- `deepEqual({ a: undefined }, { b: undefined })` must be `false` even though both lookups return `undefined`.
- `deepEqual([1, , 3], [1, undefined, 3])`: decide and state your answer for sparse arrays.
- Two objects that point at each other (`a.peer = b; b.peer = a`) compared against a similar pair.
- `new Date(NaN)` vs `new Date(NaN)`.

## Follow-ups
1. **Symbol keys.** Clone and compare own enumerable symbol-keyed properties too (`Object.getOwnPropertySymbols` filtered by enumerability).
2. **Preserve prototypes.** `deepClone(new Point(1, 2))` should return an object whose prototype is `Point.prototype`, and `deepEqual` should treat objects with different prototypes as unequal. What breaks for classes with private `#fields`?
3. **Typed arrays and ArrayBuffer.** Support `Uint8Array` and friends, including two typed arrays that view the same buffer.
4. **Property descriptors.** Preserve getters/setters and non-writable properties instead of flattening them into values. When is that the right call?
5. **Stack safety.** Rewrite `deepClone` iteratively with an explicit stack so a 100 000-deep linked list doesn't overflow. Compare with `structuredClone` and explain what it can and cannot clone.

## Concepts covered
Type dispatch with `Object.prototype.toString` / `instanceof` · recursion over heterogeneous containers · `WeakMap` visited maps for cycles and shared references · SameValueZero · pairwise cycle detection in equality.

Related: S31 memoize & LRU (cache keys) · S35 Transactional KV store · S36 Virtual DOM (diffing).
