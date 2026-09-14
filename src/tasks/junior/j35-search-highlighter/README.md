# Text Search Highlighter

## Problem statement
A help-centre search page shows article snippets with the user's search terms highlighted. Build it in two layers:

1. **`highlight(text, queries)`**: a pure function that splits `text` into an ordered list of segments, each marked as a match or not.
2. **`<Highlighter text query />`**: a component that renders those segments, wrapping matches in `<mark>`.

The tricky part is the matching rules, not the rendering. Matching ignores case. When matches overlap or touch, they become one highlight. A query like `c++` or `$5.00` is matched as literal text and doesn't break or change the search.

## Clarifying questions to ask
- Case-sensitive? *(No. `react` matches `React`, and the output keeps the original casing from `text`.)*
- Whole words only, or substrings? *(Substrings: `act` matches inside `React`. Whole words is a follow-up.)*
- If the component gets `query` as a string, is it one phrase or several terms? *(Several terms, split on whitespace: `"react hooks"` highlights `react` and `hooks` separately.)*
- If two terms overlap (`"abc"` and `"bcd"` in `"abcde"`), what is highlighted? *(One mark covering `"abcd"`.)*
- Two matches that touch (`"foo"` and `"bar"` in `"foobar"`)? *(One mark covering `"foobar"`.)*
- Can a single term overlap itself, like `"aa"` in `"aaaa"`? *(Yes. Every occurrence counts, overlapping ones too, so all of `"aaaa"` is one match.)*
- Is the text HTML? *(No, plain text. Never use `dangerouslySetInnerHTML`. Highlighting inside existing DOM is follow-up 2.)*

## Functional requirements
- [ ] `highlight(text, queries)` returns `Segment[]` in text order. Joining every `segment.text` gives exactly `text`.
- [ ] Matching is case-insensitive. Segment text keeps the original characters from `text`.
- [ ] Every occurrence of every query is found, including occurrences that overlap each other.
- [ ] Overlapping and adjacent matched ranges merge into a single `match: true` segment.
- [ ] Two neighbouring segments never have the same `match` value, and no segment has empty `text`.
- [ ] Characters with special meaning in regular expressions (`. * + ? ^ $ { } ( ) | [ ] \ /`) are matched literally.
- [ ] Empty strings and whitespace-only strings in `queries` are ignored. With no usable queries the result is a single non-match segment, or `[]` when `text` is empty.
- [ ] `<Highlighter text query />` renders `text` with every matched segment inside a `<mark>` and non-matched text outside any `<mark>`. A string `query` is split on whitespace.
- [ ] The rendered text content is exactly `text`, with no added spaces or characters.

## Non-functional requirements
- **Accessibility:** `<mark>` is the semantic element for highlighted search matches, so don't use a styled `<span>`. Screen readers read the text continuously, so don't split words with extra whitespace or elements that announce anything. The highlight colour needs at least 3:1 contrast against the background, and the text inside needs 4.5:1 contrast. Use `forced-colors`-friendly styling (`Mark`/`MarkText` system colours).
- **Keyboard:** no interaction in the base task.
- **Performance:** a 10,000-character text with 3 terms must highlight without noticeable lag on every keystroke. The component shouldn't recompute segments when neither `text` nor `query` changed. Avoid O(n²) string building.
- **Security:** user input goes into a `RegExp` (if you use one) only after escaping, and into the DOM only as text.

## Constraints
- 35 minutes. React, TypeScript and CSS Modules only. No `lodash.escapeRegExp` or highlight libraries.
- Keep the public types in `types.ts` unchanged. Export `highlight` as a named export and the component as the default export from `Solution.tsx`.

## Data / API contract
```ts
interface Segment { text: string; match: boolean }

function highlight(text: string, queries: string[]): Segment[];

interface HighlighterProps {
  text: string;
  query: string | string[];   // string → split on whitespace
}
export default function Highlighter(props: HighlighterProps): JSX.Element;

// Follow-up 2
function highlightInDom(root: Element, queries: string[]): number;
```

Example:
```ts
highlight('React Hooks and react-dom', ['react', 'hook'])
// → [
//   { text: 'React', match: true },
//   { text: ' ', match: false },
//   { text: 'Hook', match: true },
//   { text: 's and ', match: false },
//   { text: 'react', match: true },
//   { text: '-dom', match: false },
// ]
```

## Test contract
- `highlight` is compared with `toEqual` against exact `Segment[]` arrays.
- Component tests read `container.textContent`, and collect highlighted pieces with `container.querySelectorAll('mark')` and their `textContent`. Test contract exception: `<mark>` is the required element, so it is queried by tag.
- Nothing is wrapped in `<mark>` when there are no matches.
- Follow-up 2 tests build a DOM tree with `innerHTML`, call `highlightInDom`, then check the returned count, the marks' text, that `root.textContent` is unchanged, and that existing elements (e.g. `<b>`) are still in place.

## Edge cases
- `queries` contains duplicates, or one query contains another (`"react"` and `"act"`).
- A query longer than `text`.
- A query that is only regex syntax, e.g. `".*"`, which must match only the literal characters `.*`.
- Matches at the very start and very end of `text`.
- `text` is empty.
- Characters whose lowercase form has a different length (`"İ".toLowerCase()` is 2 UTF-16 units). Mention the risk of index drift if you compare lowercased copies. You don't need to solve it.
- `query` changes on every keystroke. Should an old highlight remain while typing? *(No, render from the current props.)*

## Follow-ups
1. **Result navigator.** Render a list of search results, highlight the matches in all of them, and add a `"3 of 12"` counter with `Previous match` / `Next match` buttons. The current match gets a distinct style and scrolls into view. The count updates politely in a live region, and the controls wrap around.
2. **Highlight inside existing DOM.** The snippet is already-rendered HTML (`<p>Use <b>React</b> hooks</p>`). Implement `highlightInDom(root, queries)` with a `TreeWalker` over text nodes. It wraps matches in `<mark>` without touching element structure, attributes or event listeners, and skips `<script>`/`<style>`. Matches that span two text nodes are out of scope, but explain how you'd handle them. Also say how you'd undo the highlighting.
3. **Accent-insensitive search.** Typing `cafe` should highlight `Café` in the original text. Normalise for comparison (`NFD` and stripping combining marks) and map indices back to the original string correctly.
4. **Whole words and phrases.** Support `wholeWord: true`, and quoted phrases in the query string (`"react hooks" state` = the phrase plus one term).
5. **Huge documents.** The text is a 2 MB log file. Where does the time go (regex per term, merging, React rendering thousands of `<mark>`s)? How would you keep typing responsive (`useDeferredValue`, only rendering visible lines, a worker)?

## Concepts covered
Regex escaping · finding overlapping occurrences · merging intervals · pure functions vs rendering · `useMemo` for derived data · semantic `<mark>` · `TreeWalker` / text nodes (follow-up) · Unicode normalisation pitfalls.

Related: S02 Autocomplete · J21 Dictionary Search · S34 DOM Traversal
