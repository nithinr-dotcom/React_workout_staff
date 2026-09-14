# JSON.stringify & JSON.parse

## Problem statement
Write your own `stringify(value)` and `parse(text)` without calling the native `JSON` object.

- `stringify` must produce **exactly** the same string as `JSON.stringify` for the same input. That includes all the odd rules: which values disappear, which become `null`, how `toJSON` works, and when it throws.
- `parse` is a hand-written **recursive-descent parser**. It turns valid JSON text into values and throws a `SyntaxError` for anything that isn't valid JSON.

Meta has asked for `JSON.stringify`, and it is one of the GreatFrontEnd 75. It looks like a recursion warm-up. It is really a test of whether you know the language's edge cases and can write a small parser without regular-expression hacks.

## Clarifying questions to ask
- Do we need `replacer` and `space`? *(Not in the base version. They are follow-up 1.)*
- Do we need a `reviver` for `parse`? *(Not in the base version. It is follow-up 2.)*
- What happens with a top-level `undefined`, function or symbol? *(Return `undefined`, like native.)*
- Objects and arrays that appear twice but aren't cyclic? *(Serialise them each time. Only a real cycle throws.)*
- How strict is `parse`? *(Exactly the JSON grammar from RFC 8259: no comments, no trailing commas, no single quotes, no leading zeros, no `NaN`.)*
- Does the error message matter? *(Only the type, `SyntaxError`, matters. Better messages are follow-up 4.)*

## Functional requirements
### stringify
- [ ] Strings, finite numbers, booleans and `null` serialise like native. `-0` becomes `"0"`.
- [ ] `NaN`, `Infinity` and `-Infinity` become `null`.
- [ ] Strings are wrapped in double quotes. `"` and `\` are escaped, `\b \f \n \r \t` use their short escapes, and every other character below U+0020 becomes `\u00XX` with lowercase hex.
- [ ] Objects include their own enumerable **string** keys, in the order `Object.keys` gives. Symbol keys are ignored.
- [ ] Inside an object, a property whose value is `undefined`, a function or a symbol is **omitted**.
- [ ] Inside an array, `undefined`, functions and symbols become **`null`**. Holes in sparse arrays become `null` too.
- [ ] A top-level `undefined`, function or symbol returns `undefined` (not the string `"undefined"`).
- [ ] If a value has a `toJSON` method, it is called with the property key (`""` at the top level, the index as a string in arrays), and its result is serialised instead. This works at any depth. `Date` works this way.
- [ ] `Map`, `Set`, `RegExp` and `Error` have no enumerable own keys, so they serialise as `"{}"`.
- [ ] Boxed primitives (`new String('a')`, `new Number(1)`, `new Boolean(false)`) serialise like their primitive values.
- [ ] A `BigInt` anywhere throws a `TypeError`.
- [ ] A circular reference throws a `TypeError`. The same object appearing twice without a cycle does **not** throw.

### parse
- [ ] Parses `null`, `true`, `false`, numbers, strings, arrays and objects, nested to any depth.
- [ ] Numbers follow the JSON grammar: optional `-`, no leading zeros (except `0` itself), optional fraction, optional exponent with `e`/`E` and an optional sign.
- [ ] Strings support the escapes `\" \\ \/ \b \f \n \r \t \uXXXX`. A raw control character (below U+0020) inside a string is an error.
- [ ] Whitespace (space, tab, `\n`, `\r`) is allowed around every token and nowhere else.
- [ ] In objects, a later duplicate key overwrites an earlier one.
- [ ] A `"__proto__"` key becomes an ordinary **own** property. It must not change the result's prototype.
- [ ] Anything else throws a `SyntaxError`: empty input, trailing commas, single quotes, unquoted keys, leading zeros, `NaN`/`undefined`/`Infinity`, unterminated strings or containers, bad escapes, and extra content after the value.

## Non-functional requirements
- No libraries. Don't call `JSON.stringify` or `JSON.parse`, and don't use `eval` or `new Function`.
- `parse` reads the input left to right in a single pass: O(n) time. No repeated slicing of the remaining input.
- `stringify` detects cycles with the current ancestor chain, not a "seen ever" set, so shared references still work.
- Deeply nested input (a few thousand levels) is allowed to hit the native recursion limit, just like native does. Say so if asked.

## Constraints
- 80 minutes.
- Export `stringify` and `parse` as named exports from `Solution.ts`. The contract lives in `types.ts`.
- Using `Number(text)` to convert an already validated number token is allowed.

## Data / API contract
```ts
type Replacer = ((this: any, key: string, value: any) => any) | (string | number)[] | null; // follow-up 1
type Reviver = (this: any, key: string, value: any) => any;                              // follow-up 2

function stringify(value: unknown, replacer?: Replacer, space?: string | number): string | undefined;
function parse(text: string, reviver?: Reviver): unknown;
```

## Test contract
- Tests call `stringify` and `parse` as **named exports**.
- Most tests loop over a table of inputs and compare your output with the native `JSON.stringify` / `JSON.parse` for the same input (`toBe` for strings, `toEqual` for parsed values).
- Error cases are checked with `toThrow(TypeError)` (stringify) and `toThrow(SyntaxError)` (parse). Messages aren't checked.
- One test spies on `JSON.stringify` and `JSON.parse` and expects neither to be called while your code runs.
- Follow-up tests (`npm run test:followups -- s38`) compare `stringify(value, replacer, space)` and `parse(text, reviver)` with native.

## Edge cases
- `{ a: undefined }` → `"{}"`, but `[undefined]` → `"[null]"`.
- `toJSON` that returns `undefined` inside an object: the property disappears.
- `new Date(NaN)`: its `toJSON` returns `null`.
- Lone surrogates such as `'\ud800'` are escaped as `\ud800` by modern engines (well-formed `JSON.stringify`).
- Object keys that need escaping, such as `{ 'a"b': 1 }`.
- `parse('{"__proto__": {"x": 1}}')`: what does a naive `obj[key] = value` do here, and why is that a security problem?
- `parse('"\\u00e9"')` and surrogate pairs written as two `\u` escapes.
- `parse(' 1 ')` is valid, `parse('1 2')` is not.

## Follow-ups
1. **`replacer` and `space`.** Support both arguments exactly like native. A replacer function is called with the holder object as `this`, starting with key `""`, and runs after `toJSON`. An array replacer is an allow-list of keys for objects (not arrays). `space` as a number means that many spaces (capped at 10). As a string, it uses the first 10 characters. Empty objects and arrays stay `{}` and `[]`.
2. **`reviver`.** Support `parse(text, reviver)`. The reviver runs bottom-up (children before parents), with the holder as `this`, finishing with key `""` on a wrapper object. Returning `undefined` deletes the property.
3. **Circular-safe stringify.** Write `safeStringify(value)` for logging. Instead of throwing, it writes `"[Circular]"` where a cycle closes, and `"[BigInt: 10]"` for BigInts. Why is this dangerous for data you send to a server?
4. **Error positions.** Make parse errors useful: `Unexpected token } in JSON at position 7 (line 1, column 8)`. How would a code editor show several errors instead of stopping at the first one?
5. **Big payloads.** A 50 MB response freezes the page for a second in `JSON.parse`. Discuss options: a Web Worker, a streaming parser, NDJSON, or `Response.json()`. Which ones actually take the work off the main thread?

## Concepts covered
Recursive serialisation · ancestor-stack cycle detection · `toJSON` and the holder/key protocol · string escaping and code units · recursive-descent parsing with a cursor · grammar-driven validation · `SyntaxError` vs `TypeError`.

Related: S29 deepClone & deepEqual · J28 JSON → DOM renderer · J26 flatten, get & classnames · S36 Virtual DOM.
