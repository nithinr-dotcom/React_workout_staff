# DOM tree puzzles: twin node, table of contents, tree height

## Problem statement
Four small tree problems that keep showing up in frontend DSA rounds, all on real DOM elements. Implement them in plain TypeScript:

1. **`findCorrespondingNode(rootA, rootB, target)`**. `rootB` is a copy of `rootA`: the same elements in the same places. The copy was re-serialized, though, so text, whitespace and comments may differ. Given an element `target` inside tree A, return the element at the same position in tree B. Work out `target`'s index path by walking **up** from it, then walk **down** tree B along that path. Don't search either tree.
2. **`getTableOfContents(root)`** turns the `<h1>`–`<h6>` headings inside `root` into a nested outline, like the outline panel in Google Docs. It must cope with skipped levels and generate unique ids for headings that don't have one.
3. **`getTreeHeight(root)`** returns how many element levels the tree has, **without recursion**.
4. **`levelOrder(root)`** returns tag names level by level, **without recursion**.

S34 did the text-node-aware twin-node lookup. Here only elements count, and the interviewer will push on "walk the path, don't search" and on stack depth.

Flipkart's 2025 UI round asked for the twin node in a cloned n-ary tree, next to a reconciliation question. Google asks for an outline view of a document, and Amazon asks for BFE-style level traversal.

## Clarifying questions to ask
- Does "position" in `findCorrespondingNode` count text and comment nodes? *(No. Only element children count, because the two trees may be formatted differently.)*
- What if `target` is `rootA` itself? *(Return `rootB`.)*
- What if `target` isn't inside `rootA`, or tree B turns out to be missing that position? *(Return `null`. Don't throw.)*
- Which headings go into the table of contents? *(Every `h1`–`h6` that is a descendant of `root`, at any depth, in document order. `root` itself is never included.)*
- An `h1` is followed directly by an `h3`. Do we invent an empty `h2`? *(No. The `h3` becomes a direct child of the `h1`.)*
- What if the first heading is an `h3` and an `h2` comes after it? *(Both are top-level entries. A heading only nests under an earlier heading with a smaller level number.)*
- Should `getTableOfContents` set generated ids on the headings? *(No. It only reads the DOM. Wiring up anchors is the caller's job.)*
- Is the height of a root with no element children 0 or 1? *(1. Height counts levels of elements.)*
- Why no recursion? *(A document can be nested thousands of levels deep, e.g. generated or malicious HTML. Tests use a tree 50,000 levels deep.)*

## Functional requirements
### `findCorrespondingNode`
- [ ] Returns `rootB` when `target === rootA`.
- [ ] Returns the element at the same element-index path in `rootB`, at any depth.
- [ ] Positions are counted among **element** children only. Differences in text, whitespace and comments between the trees don't matter.
- [ ] Returns `null` when `target` is not `rootA` or a descendant of it.
- [ ] Returns `null` when the path doesn't exist in `rootB`.
- [ ] Never visits subtrees that aren't on the path, in either tree.

### `getTableOfContents`
- [ ] Every `h1`–`h6` descendant of `root` becomes an entry `{ text, level, id, children }`, in document order.
- [ ] `text` is the heading's `textContent`, with runs of whitespace collapsed to one space and the ends trimmed.
- [ ] Nesting: a heading becomes a child of the **closest preceding heading with a smaller level**. If there is none, it is a top-level entry. Skipped levels don't create empty entries.
- [ ] `id` is the heading's own `id` attribute when it's non-empty.
- [ ] Otherwise `id` is a slug made from `text`:
  1. Lowercase it.
  2. Delete every character that isn't `a-z`, `0-9`, whitespace or `-`.
  3. Trim.
  4. Replace each run of whitespace and/or hyphens with one `-`.
  5. Strip leading and trailing hyphens.
  6. If the result is empty, use `section`.
- [ ] Ids are unique. A slug that is already taken gets the first free suffix: `intro`, `intro-1`, `intro-2`, …. An id is taken if an earlier entry uses it, or if **any** element inside `root` already has it as its `id` attribute, even an element that comes later.
- [ ] Doesn't modify the DOM.
- [ ] Returns `[]` when there are no headings.

### `getTreeHeight` and `levelOrder`
- [ ] `getTreeHeight(root)` returns the number of element levels: 1 for a root with no element children.
- [ ] `levelOrder(root)` returns an array per level of lowercase tag names, left to right across the whole level, starting with `[rootTag]`.
- [ ] Text and comment nodes are ignored.
- [ ] Neither function uses recursion. Both handle a 50,000-level chain without a stack overflow.

## Non-functional requirements
- **Complexity:**
  - `findCorrespondingNode` is O(depth × siblings).
  - `getTableOfContents` is O(n) in the number of elements, apart from slug suffixing.
  - `getTreeHeight` and `levelOrder` are O(n).
- **No query shortcuts in `findCorrespondingNode`.** Don't use `querySelector*`, `getElementsBy*`, `TreeWalker`, `NodeIterator` or `contains`. In the other functions, use whatever reads clearly.
- **Pure:** no function mutates either tree.
- **Memory:** `levelOrder` on a wide tree shouldn't copy the queue on every step. Know the cost of `Array.prototype.shift` and how to avoid it.

## Constraints
- 60 minutes for all four.
- Plain DOM APIs only: `parentElement`, `children`, `previousElementSibling`, `tagName`, `textContent`, `getAttribute`, `id`.
- Export every function from `Solution.ts`. The types are in `types.ts`.
- No mock API needed.

## Data / API contract
```ts
interface TocEntry {
  text: string;        // whitespace-collapsed, trimmed
  level: number;       // 1–6
  id: string;          // own id, or unique slug
  children: TocEntry[];
}

function findCorrespondingNode(rootA: Element, rootB: Element, target: Element): Element | null;
function getTableOfContents(root: Element): TocEntry[];
function getTreeHeight(root: Element): number;
function levelOrder(root: Element): string[][];

// Follow-ups
interface TreeNode { value: unknown; children: TreeNode[] }
function findInClone(rootA: TreeNode, rootB: TreeNode, target: TreeNode): TreeNode | null; // 1
function nextRightSibling(root: Element, target: Element): Element | null;                  // 2
```

## Test contract
- Tests import every function as a named export.
- Fixtures are built with `innerHTML` on detached `div`s. Tree B for the twin-node tests is the same markup with whitespace, comments and text changed.
- `findCorrespondingNode` results are compared by reference with `toBe`.
- Tests spy on `querySelector`, `querySelectorAll`, `getElementsByTagName`, `getElementsByClassName`, `contains` and `document.createTreeWalker` while it runs. None may be called.
- To check that no unrelated subtree is visited, tests redefine `children`, `childNodes`, `firstChild`, `firstElementChild`, `lastChild`, `lastElementChild` and `childElementCount` on the elements of an off-path subtree, and count reads.
- Table-of-contents results are compared with `toEqual` against the exact `TocEntry` shape (no extra keys).
- Height and level tests include a 50,000-deep chain of `div`s built with a loop.
- Follow-up 1 builds plain object trees and compares with `toBe`. Follow-up 2 compares elements with `toBe`.

## Edge cases
- `target` is `rootA`, is outside `rootA`, or is `rootB`'s own element passed by mistake.
- Tree B is formatted differently: indentation text nodes in A, none in B, plus comments.
- Headings nested inside `<section>`s and `<div>`s still count, in document order.
- A heading whose text is only punctuation or emoji → `section`, `section-1`, ….
- A heading whose explicit `id` equals another heading's generated slug. The explicit id wins and the generated one gets a suffix.
- Two headings with the same explicit id. Keep them as they are, and discuss whether you'd warn.
- A chain 50,000 levels deep: recursion overflows the call stack around 10,000 frames.
- `levelOrder` on a very wide, flat tree (10,000 children): `queue.shift()` is O(n) per call.

## Follow-ups
1. **Clone without parent pointers (Flipkart).** Your trees are now plain objects `{ value, children }` with no `parent` link. Implement `findInClone(rootA, rootB, target)`. You can't walk up any more. What's the complexity now, and would you rather build a parent map first?
2. **Next right sibling (BFE).** Implement `nextRightSibling(root, target)`: the next element on the same level to the right of `target`, even if it has a different parent. Return `null` if `target` is last on its level. Can you do it without collecting the whole level?
3. **Live outline (Google Docs).** The document is edited while the outline panel is open. Keep the ToC in sync with a `MutationObserver`. Batch updates, keep generated ids stable when unrelated headings change, and explain what must happen to ids when a heading's text changes.
4. **Render + scroll spy.** Render the ToC as a nested `<nav aria-label="Table of contents"><ol>` with anchor links, and highlight the section currently on screen. Which heading is "current" when two are visible? Discuss `IntersectionObserver` against scroll handlers.
5. **Reconciliation link.** In the same Flipkart round: how does React's reconciler find the "same" fiber between renders, and why do keys make position-based matching (like part 1) unnecessary?

## Concepts covered
Index paths via `parentElement` and `previousElementSibling` · walking down with `children[i]` · a stack of open headings to build a nested outline · slugify and de-duplication with a `Set` · BFS with a head index instead of `shift()` · explicit stacks vs recursion depth.

Related: S34 DOM traversal · S36 Virtual DOM · S05 File Explorer · J28 JSON → DOM renderer.
