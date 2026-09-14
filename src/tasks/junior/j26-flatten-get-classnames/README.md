# flatten, get & classnames

## Problem statement
Implement three small utilities that frontend interviews love because they're quick to state and easy to get subtly wrong. Export each one by name from `Solution.ts`.

1. **`flatten(arr, depth = Infinity)`** returns a new array with nested arrays flattened up to `depth` levels.
   `flatten([1, [2, [3, [4]]]], 1)` → `[1, 2, [3, [4]]]`
2. **`get(obj, path, defaultValue)`** safely reads a nested value. `path` is either a string such as `'user.addresses[0].city'` or an array of segments such as `['user', 'addresses', 0, 'city']`.
   `get({ a: [{ b: 1 }] }, 'a[0].b')` → `1`
3. **`classnames(...args)`** builds a `className` string from strings, numbers, objects and nested arrays, skipping falsy values.
   `classnames('btn', { active: true, disabled: false }, ['lg', null])` → `'btn active lg'`

## Clarifying questions to ask
- Can I use `Array.prototype.flat`? *(No, that's the point of the question. You may use other array methods.)*
- Should `flatten` mutate the input? *(Never.)*
- What does `get` return when the resolved value is `null`? *(`null`. Only `undefined` falls back to `defaultValue`.)*
- Do paths need quoted bracket keys such as `a["x.y"]`? *(No. Only dot segments and numeric `[n]` indexes.)*
- What does `get` return for an empty path? *(Not specified. Say what you'd choose and why.)*
- Should `classnames` dedupe repeated names? *(No, keep them as given.)*

## Functional requirements
### flatten
- [ ] Returns a **new** array. The input and its nested arrays are not modified.
- [ ] With the default depth, flattens every level.
- [ ] With `depth = n`, flattens exactly `n` levels, and deeper arrays stay nested.
- [ ] `depth = 0` returns a shallow copy.
- [ ] Only real arrays (`Array.isArray`) are flattened. Strings, objects and array-likes are left as items.
- [ ] Holes (empty slots) in any array being flattened are skipped, like `Array.prototype.flat`.

### get
- [ ] Accepts a string path with dot segments and `[n]` indexes, e.g. `a.b[0].c` or `matrix[1][2]`.
- [ ] Accepts an array path of string or number segments.
- [ ] Returns the value at the path.
- [ ] If a segment along the way is `null` or `undefined`, returns `defaultValue` instead of throwing.
- [ ] If the resolved value is `undefined`, returns `defaultValue`.
- [ ] `null`, `0`, `false` and `''` are real values and are returned as-is.

### classnames
- [ ] Non-empty strings are included.
- [ ] Non-zero numbers are included as strings, e.g. `1` → `'1'`. `0` is skipped.
- [ ] For objects, each key whose value is truthy is included, in key order.
- [ ] Arrays are processed recursively with the same rules.
- [ ] `false`, `true`, `null`, `undefined`, `''` and `0` are skipped.
- [ ] The result joins the names with single spaces, with no leading or trailing space. With nothing to include it returns `''`.

## Non-functional requirements
- Pure functions: no global state and no mutation of the arguments.
- `flatten` runs in O(total elements).
- `get` never throws for any combination of object and path.
- Typed in line with `types.ts`.

## Constraints
- 35 minutes for all three.
- No libraries, and no `Array.prototype.flat` or `flatMap`.
- Export the functions from `Solution.ts`.

## Data / API contract
```ts
type NestedArray<T> = Array<T | NestedArray<T>>;
type PathSegment = string | number;
type ClassDictionary = Record<string, unknown>;
type ClassValue = string | number | boolean | null | undefined | ClassDictionary | ClassValue[];

function flatten<T>(arr: NestedArray<T>, depth?: number): Array<T | NestedArray<T>>;
function get<D = undefined>(obj: unknown, path: string | PathSegment[], defaultValue?: D): unknown;
function classnames(...args: ClassValue[]): string;
function set<T extends object>(obj: T, path: string | PathSegment[], value: unknown): T; // follow-up 1
```

## Test contract
- The functions are imported as named exports and compared with `toEqual` / `toBe`.
- Follow-up tests (`npm run test:followups -- j26`) check `set` and flattening a 100 000-level-deep array.

## Edge cases
- `flatten([])` → `[]`. `flatten([[], [[]]])` → `[]`.
- An array nested so deeply that a recursive `flatten` overflows the call stack (see follow-up 2).
- `get` on a primitive in the middle of the path, e.g. `get({ s: 'abc' }, 's.length')`.
- `get` with a numeric segment on an object, e.g. `get({ 0: 'x' }, '[0]')`.
- `classnames` with an object whose values are truthy non-booleans: `{ a: 1, b: 'yes', c: 0 }`.

## Follow-ups
1. **set.** Implement `set(obj, path, value)`. It writes the value at the path, creating missing containers along the way: an **array** when the next segment is a numeric index and an **object** otherwise. It mutates and returns `obj`. For example, `set({}, 'a.b[0].c', 1)` → `{ a: { b: [{ c: 1 }] } }`.
2. **No recursion.** Make `flatten` iterative with an explicit stack so it handles 100 000 levels of nesting. The depth limit must still work, and the order must be preserved.
3. **Dedupe.** Discuss a `classnames/dedupe` variant, where later arguments override earlier ones: `cx('a', { a: false })` → `''`. Which data structure keeps the order?
4. **Typed paths.** Sketch a TypeScript type `PathValue<T, P>` so that `get(user, 'address.city')` returns `string`. Where do template literal types hit their limits?

## Concepts covered
Recursion vs an explicit stack · parsing a path into segments · `null` vs `undefined` semantics · `Array.isArray` and sparse arrays · variadic arguments · pure functions.

Related: J27 Polyfills · J28 JSON → DOM renderer · S-level deep clone / deep equal tasks.
