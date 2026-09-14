# getElementsByClassName & DOM traversal

## Problem statement
Browser APIs hide how the DOM is structured. In this task you walk the tree by hand. Implement three functions without using the built-in query APIs:

1. **`getElementsByClassName(root, classNames)`** returns every descendant element of `root` that has **all** of the classes in `classNames` (a whitespace-separated string, like `"card active"`).
2. **`getElementsByStyle(root, property, value)`** returns every descendant element whose **computed** style for `property` equals `value`. For example, `getElementsByStyle(root, 'color', 'red')` must match an element whose computed colour is `rgb(255, 0, 0)`.
3. **`findCorrespondingNode(rootA, rootB, nodeA)`** takes two DOM trees with identical structure and a node inside the first one. It returns the node at the same position in the second tree.

This is a common Meta phone-screen format: three small traversal problems in one sitting. The interviewer then asks about complexity, recursion depth and edge cases.

## Clarifying questions to ask
- Is `root` itself included in the results? *(No. Only descendants, the same as the native `element.getElementsByClassName`.)*
- What order should results be in? *(Document order, i.e. a pre-order depth-first traversal.)*
- Is class matching case-sensitive, and can it match substrings? *(Case-sensitive, whole tokens only: `btn` does not match `btn-primary`.)*
- What does an empty or whitespace-only `classNames` return? *(An empty array.)*
- For `getElementsByStyle`, is the value compared to the inline style or the computed style? *(The computed style. `red` and `rgb(255, 0, 0)` count as equal, and inherited values count.)*
- Does "same position" in `findCorrespondingNode` include text and comment nodes? *(Yes. Positions are measured using `childNodes`, not `children`.)*
- Can I use `querySelectorAll`? *(Not in the three base functions. That is the point of the exercise.)*

## Functional requirements
- [ ] `getElementsByClassName` returns descendants of `root` (never `root` itself), in document order.
- [ ] An element matches only if it has **every** class token in `classNames`. Tokens can be separated by any whitespace, and order and repetition don't matter.
- [ ] Class matching is by whole token and case-sensitive.
- [ ] Empty or whitespace-only `classNames` returns `[]`.
- [ ] `getElementsByStyle` returns descendants whose computed value for `property` (kebab-case, e.g. `margin-top`) equals `value`, **after normalizing `value` the way the browser would** (e.g. `red` → `rgb(255, 0, 0)`).
- [ ] Styles can come from inline `style` attributes, `<style>` sheets or inheritance. Anything reflected in `getComputedStyle` counts.
- [ ] `findCorrespondingNode` returns `rootB` when `nodeA === rootA`.
- [ ] `findCorrespondingNode` works for element nodes and text nodes at any depth.
- [ ] `findCorrespondingNode` returns `null` when `nodeA` is not inside `rootA`.
- [ ] None of the base functions use `querySelector`, `querySelectorAll`, `getElementsByClassName`, `getElementsByTagName`, `matches`, `closest`, `TreeWalker` or `NodeIterator`.

## Non-functional requirements
- **Complexity:** `getElementsByClassName` and `getElementsByStyle` are O(n) in the number of descendants, with a small per-node cost. Don't parse `classNames` again for every node.
- `findCorrespondingNode` should be O(depth × siblings) and must **not** search all of `rootB`.
- **Robustness:** handle deep trees. Be ready to explain whether your recursion could overflow the stack and how to make it iterative.
- **No side effects:** if you create a helper element to normalize a style value, remove it before you return.

## Constraints
- 50 minutes. Plain DOM APIs only (`childNodes`, `children`, `parentNode`, `classList` / `getAttribute`, `getComputedStyle`).
- Export all functions from `Solution.ts`. The types are in `types.ts`.
- No mock API needed.

## Data / API contract
```ts
interface DomTraversalModule {
  getElementsByClassName(root: Element, classNames: string): Element[];
  getElementsByStyle(root: Element, property: string, value: string): Element[];
  findCorrespondingNode(rootA: Node, rootB: Node, nodeA: Node): Node | null;
  /** Follow-up 1 */
  getCssSelector(element: Element, root?: ParentNode): string;
}
```

## Test contract
- Tests import `getElementsByClassName`, `getElementsByStyle`, `findCorrespondingNode` and (follow-up 1) `getCssSelector` as named exports.
- Fixtures are built with `innerHTML` in jsdom and **attached to `document.body`**, so `<style>` sheets apply.
- Results are compared as **arrays of element references in document order** (`toEqual([...])` with the exact elements).
- Tests spy on `Element.prototype.querySelector`, `querySelectorAll`, `getElementsByClassName`, `getElementsByTagName`, `matches` and `closest`, and on `Document.prototype.querySelector` / `querySelectorAll`, while the base functions run. None of them may be called.
- `getElementsByStyle` tests use `color` with named colours such as `red`, and non-inherited properties such as `display` and `margin-top`.
- Follow-up 1 tests assert `root.querySelector(getCssSelector(el, root)) === el` for several elements.

## Edge cases
- Elements with extra whitespace or duplicate classes in `class="  a   b a "`.
- SVG elements, whose `className` is an `SVGAnimatedString`, not a string. `classList` or `getAttribute('class')` are safer.
- Text and comment nodes mixed with elements: only elements can match classes or styles.
- A `value` the browser can't parse, e.g. `getElementsByStyle(root, 'color', 'not-a-colour')`: return `[]`, don't throw.
- `nodeA` is `rootA`, or `nodeA` belongs to a different tree.
- Very deep trees (10,000+ levels) where recursion hits the call-stack limit.

## Follow-ups
1. **Generate a CSS selector.** Implement `getCssSelector(element, root)` so that `root.querySelector(selector)` returns exactly that element. Prefer ids when they are unique, otherwise build a path with `:nth-child`. How would you keep it short and stable across small DOM changes?
2. **Iterative traversal.** Rewrite `getElementsByClassName` without recursion, using an explicit stack, and keep document order.
3. **Live collection.** The native API returns a *live* `HTMLCollection`. Sketch how you'd keep results in sync as the DOM changes (`MutationObserver`), and when that is worth the cost.
4. **Shadow DOM.** Extend the traversal to descend into open shadow roots. What does "document order" mean then?

## Concepts covered
Pre-order DFS over the DOM · `Node` vs `Element` · `childNodes` vs `children` · `DOMTokenList` · computed vs inline style · letting the browser normalize values · tree paths via `parentNode` + sibling index · recursion depth.

Related: S36 Virtual DOM · S29 deepClone & deepEqual · S05 File explorer.
