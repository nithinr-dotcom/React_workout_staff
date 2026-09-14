# groupBy, chunk, deepMerge, deepOmit & squashObject

## Problem statement
"Write `groupBy`" and "flatten this nested config into dot paths" are everyday warm-ups. Meesho has asked for a `groupBy` polyfill, and GreatFrontEnd and BFE.dev list Group By, Chunk, Deep Omit and Squash Object among their most-solved utility questions. They look easy, but each one tests something specific: prototype-safe dictionaries, telling a plain object from an array or a `Date`, recursion without mutation, and building a path.

Implement these as named exports from `Solution.ts`:

| Function | Example |
|---|---|
| `groupBy(arr, keyFnOrProp)` | `groupBy([1.2, 1.8, 2.1], Math.floor)` → `{ '1': [1.2, 1.8], '2': [2.1] }` |
| `chunk(arr, size)` | `chunk([1, 2, 3, 4, 5], 2)` → `[[1, 2], [3, 4], [5]]` |
| `deepMerge(a, b)` | `deepMerge({ ui: { dark: false, size: 'm' } }, { ui: { dark: true } })` → `{ ui: { dark: true, size: 'm' } }` |
| `deepOmit(value, keys)` | `deepOmit({ a: 1, b: { a: 2, c: [{ a: 3, d: 4 }] } }, ['a'])` → `{ b: { c: [{ d: 4 }] } }` |
| `squashObject(obj)` | `squashObject({ a: { b: 1, c: [1] } })` → `{ 'a.b': 1, 'a.c.0': 1 }` |
| `unsquashObject(flat)` | `unsquashObject({ 'a.b': 1, 'a.c.0': 1 })` → `{ a: { b: 1, c: [1] } }` |

## Clarifying questions to ask
- For `groupBy` with a property name, what if the property is missing? *(The key is `String(undefined)`, i.e. `'undefined'`.)*
- In which order do groups and items appear? *(Groups in order of first appearance, items in input order.)*
- What should `chunk` do with `size` of `0`, a negative number, or a fraction? *(Sizes below `1` return `[]`. Fractions are rounded down first, so `2.7` behaves like `2`.)*
- What counts as a "plain object" for `deepMerge` and `deepOmit`? *(An object whose prototype is `Object.prototype` or `null`. Arrays, `Date`, `Map`, class instances and functions are values, not containers to merge into.)*
- In `deepMerge`, what happens to arrays? *(`b`'s array replaces `a`'s. Concatenation is follow-up 2.)*
- In `deepMerge`, does `undefined` in `b` overwrite a value in `a`? *(Assume yes, like object spread. Not tested. Mention that lodash skips it.)*
- Can the result share nested objects with the inputs? *(Merged plain objects must be new objects, so mutating the result never changes `a` or `b`. Values that are copied over unchanged may be shared.)*
- How does `squashObject` handle empty objects and arrays? *(Keep them as leaf values, e.g. `{ a: {} }` → `{ a: {} }`, so the inverse can restore them. Not tested, since GreatFrontEnd drops them instead.)*
- In `unsquashObject`, when does a segment create an array? *(When the **next** segment is a non-negative integer, e.g. `'0'` or `'12'`. The top level is always an object.)*

## Functional requirements
### groupBy
- [ ] Accepts a function `(item) => key` or a property name.
- [ ] Returns an object mapping `String(key)` to the items with that key, in input order.
- [ ] Works for keys that collide with `Object.prototype` names, such as `'constructor'`, `'toString'` and `'hasOwnProperty'`.
- [ ] Returns `{}` for an empty array. Doesn't mutate the input.

### chunk
- [ ] Splits the array into consecutive arrays of `size` items. The last one holds the remainder.
- [ ] `size < 1` returns `[]`. Fractional sizes are rounded down.
- [ ] Returns `[]` for an empty array. Doesn't mutate the input.

### deepMerge
- [ ] Returns a new object with the keys of both. When a key exists in both and **both** values are plain objects, they are merged recursively.
- [ ] Otherwise the value from `b` wins. That includes arrays, which replace (not merge), and a primitive replacing an object or the other way round.
- [ ] Neither input is mutated, at any depth. Merged nested objects are new objects.
- [ ] Non-plain objects (`Date`, `Map`, class instances) are treated as values and are not merged into.

### deepOmit
- [ ] Returns a copy of `value` in which every own property whose name is in `keys` is removed, at any depth.
- [ ] Recurses into plain objects **and arrays**. Array elements stay in order.
- [ ] Primitives, `null` and non-plain objects are returned as-is.
- [ ] Doesn't mutate the input.

### squashObject
- [ ] Returns a one-level object whose keys are the paths to each leaf, with segments joined by `'.'`.
- [ ] Array indexes are path segments too: `{ c: [7, 8] }` → `{ 'c.0': 7, 'c.1': 8 }`.
- [ ] Leaves are anything that isn't a plain object or array: primitives, `null`, `undefined`, `Date` and so on. They are kept, including `null`.

### unsquashObject
- [ ] Splits each key on `'.'` and rebuilds the nested structure.
- [ ] A container is an array when the segment that follows it is a non-negative integer, otherwise an object.
- [ ] `unsquashObject(squashObject(x))` deep-equals `x` for plain data without empty containers.

## Non-functional requirements
- Pure functions: no global state and no mutation of any argument.
- Each function is O(total size of the input).
- Typed as in `types.ts`.

## Constraints
- 40 minutes for all six.
- No libraries, and no `Object.groupBy` or `Map.groupBy`.
- Export every function from `Solution.ts`.

## Data / API contract
```ts
type PlainObject = Record<string, unknown>;
interface DeepMergeOptions { arrays?: 'replace' | 'concat' }   // follow-up 2
interface SquashOptions { separator?: string }                 // follow-up 4

function groupBy<T>(arr: readonly T[], keyFnOrProp: ((item: T) => PropertyKey) | keyof T): Record<string, T[]>;
function chunk<T>(arr: readonly T[], size: number): T[][];
function deepMerge<A extends PlainObject, B extends PlainObject>(a: A, b: B, options?: DeepMergeOptions): A & B;
function deepOmit<T>(value: T, keys: readonly string[]): T;
function squashObject(obj: PlainObject, options?: SquashOptions): PlainObject;
function unsquashObject(flat: PlainObject, options?: SquashOptions): PlainObject;
```

## Test contract
- The functions are imported as named exports and compared with `toEqual` / `toBe`. `toEqual` doesn't check prototypes, so a `groupBy` result may be `{}` or `Object.create(null)`.
- Mutation is checked by comparing `JSON.stringify` of the inputs before and after, and by mutating the result.
- Follow-up tests (`npm run test:followups -- j30`) check `deepMerge(a, b, { arrays: 'concat' })` and the `separator` option of `squashObject` / `unsquashObject`.

## Edge cases
- `groupBy` with the key `'__proto__'`. What happens with `result[key] = []` on a normal `{}`?
- `chunk` when `size` is larger than the array: one chunk with every item.
- `deepMerge` where `a` has an array and `b` has a plain object at the same key, or the other way round.
- `deepOmit` on a top-level array, e.g. `deepOmit([{ id: 1, secret: 'x' }], ['secret'])`.
- `squashObject` where an original key itself contains a dot: `{ 'a.b': 1 }` and `{ a: { b: 1 } }` squash to the same thing.
- `unsquashObject` with conflicting keys, e.g. `{ a: 1, 'a.b': 2 }`.

## Follow-ups
1. **groupBy polyfill.** Install your `groupBy` as `Array.prototype.myGroupBy(cb)` the safe way, as Meesho asked. Then compare it with the standard `Object.groupBy` and `Map.groupBy`: when do you need a `Map` result?
2. **Array merge strategy.** Add `deepMerge(a, b, { arrays: 'concat' })`, where arrays at the same key are concatenated (`a`'s items, then `b`'s) instead of replaced. The default stays `'replace'`.
3. **Circular references.** `deepOmit` and `squashObject` recurse forever on `const a = {}; a.self = a`. Detect cycles with a `WeakSet` and decide what to do: throw, skip, or keep a reference. Why a `WeakSet` and not a `Set`?
4. **Custom separator.** Support `{ separator }` in both `squashObject` and `unsquashObject`, e.g. `'/'` → `{ 'a/b': 1 }`. How would you escape a separator that appears inside a key?
5. **Typed results.** Sketch a TypeScript type for `squashObject` so `{ a: { b: number } }` becomes `{ 'a.b': number }`. Where does it stop being practical?

## Concepts covered
Recursion over plain objects and arrays · telling plain objects from other objects · immutable updates · prototype-safe dictionaries · building and parsing path keys · inverse functions.

Related: J26 flatten, get & classnames · J27 Polyfills · S29 deepClone & deepEqual.
