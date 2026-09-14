# Virtual DOM: createElement, render & diff

## Problem statement
Build the core of a tiny React-like library in plain TypeScript, with no React.

1. **`h(type, props, ...children)`** returns a plain-object description of an element (a *virtual node*). Text is represented by plain strings.
2. **`render(vnode, container)`** creates real DOM for a virtual tree and mounts it as the container's only child.
3. **`patch(container, oldVNode, newVNode)`** updates the DOM that was rendered for `oldVNode` so it matches `newVNode`, making **as few DOM changes as possible**. DOM nodes that still correspond to the same virtual node must be **kept, not recreated**: same element reference, same focus, same listeners.

```ts
const view = (count: number) =>
  h('div', { class: 'counter' },
    h('span', null, 'Count: ', count),
    h('button', { onClick: () => update(count + 1) }, '+1'),
  );

render(view(0), app);
patch(app, view(0), view(1)); // only the "0" text node's value changes
```

## Clarifying questions to ask
- How are text nodes represented? *(As strings in `children`. Numbers are converted to strings. `null`, `undefined`, `true` and `false` children are dropped, and nested arrays are flattened.)*
- Are adjacent strings merged into one text node? *(No. Each string child is its own text node.)*
- How are props applied? *(See the functional requirements: `on*` functions become listeners, `value`/`checked` are set as DOM properties, everything else becomes an attribute named exactly as in HTML, e.g. `class`, `for`, `aria-label`.)*
- Do we need components (functions as `type`), hooks or a scheduler? *(No. Only host elements. Components are a follow-up.)*
- How are children matched when diffing? *(By index for the base version. Keyed matching is follow-up 1.)*
- Is `style` as an object supported? *(No. Pass `style` as a string attribute. Object styles are a follow-up.)*

## Functional requirements
### `h`
- [ ] Returns `{ type, props, children, key }`. `props` is `{}` when `null` was passed.
- [ ] `key` is taken out of props (`props.key` → `vnode.key`, and it does not appear in `vnode.props`). It is `null` when absent.
- [ ] Children are normalized: nested arrays flattened, `null`/`undefined`/booleans removed, numbers converted to strings, strings kept as they are (not merged).

### `render`
- [ ] Removes any existing content of `container`, then mounts the DOM for `vnode` as its only child and returns that node.
- [ ] Strings become text nodes. Elements are created with `document.createElement(type)` and get their props and children.
- [ ] **Props:**
  - A prop named `on` + a capital letter (e.g. `onClick`, `onInput`) with a function value is added as an event listener for the lowercased event name (`click`, `input`).
  - `value` and `checked` are assigned as DOM properties.
  - `true` sets the attribute to an empty string. `false`, `null` and `undefined` mean the attribute is absent.
  - Any other value is set with `setAttribute(name, String(value))`.

### `patch`
- [ ] If the old and new vnodes are both strings: the same text node is kept, and `nodeValue` is updated only when the text differs.
- [ ] If both are elements with the same `type`: the **same element** is kept. Attributes missing from the new props are removed, changed attributes are updated, and unchanged attributes are not touched.
- [ ] Event listeners are updated: if a handler changes, the old one stops firing and the new one fires. If the prop is removed, nothing fires.
- [ ] Otherwise (string ↔ element, or a different `type`): a new node is created and **replaces** the old one in place.
- [ ] Children are compared by index and patched recursively. Extra new children are appended, and extra old children are removed.
- [ ] Returns the DOM node that now represents `newVNode`. Patching again with that vnode as `oldVNode` works.
- [ ] Patching a tree against an identical tree performs **zero** DOM mutations.

## Non-functional requirements
- **Minimal mutations:** changing one text deep in a large tree produces exactly one DOM mutation, a `characterData` change.
- **Complexity:** `patch` is O(n) in the number of vnodes. No full re-render, and no `innerHTML`.
- **Correctness:** element identity is preserved wherever the type matches. That's what keeps focus, selection, scroll position and CSS transitions intact.
- **No leaks:** replaced subtrees are discarded, and listeners you added are not duplicated on repeated patches.

## Constraints
- 60 minutes. Plain DOM APIs (`createElement`, `createTextNode`, `setAttribute`, `removeAttribute`, `addEventListener`, `replaceChild`, `appendChild`, `removeChild`). No `innerHTML`, no libraries.
- Export `h`, `render` and `patch` from `Solution.ts`. The types are in `types.ts`.
- No mock API needed.

## Data / API contract
```ts
type Props = Record<string, unknown>;

interface VElement {
  type: string;
  props: Props;                     // never null, never contains `key`
  children: VNode[];                // normalized
  key: string | number | null;
}
type VNode = VElement | string;
type Child = VNode | number | boolean | null | undefined | Child[];

function h(type: string, props: Props | null, ...children: Child[]): VElement;
function render(vnode: VNode, container: Element): Node;
function patch(container: Element, oldVNode: VNode, newVNode: VNode): Node;
```

## Test contract
- Tests import `h`, `render` and `patch` as named exports.
- `h` output is compared with `toEqual` against the exact shape above.
- Tests keep references to DOM nodes (`container.firstChild`, `getElementsByTagName(...)[i]`, `childNodes[i]`) before a `patch` and assert with `toBe` that they are the same nodes afterwards, or `not.toBe` when a replacement is expected.
- Tests attach a `MutationObserver` (`childList`, `attributes`, `characterData`, `subtree`) and read `observer.takeRecords()` synchronously right after `patch`, to count mutations.
- Events are fired with `element.click()` or `dispatchEvent(new Event('input'))`.
- Follow-up 1 tests use `key` on list items and check that reordering, inserting and removing keep the identity of the keyed elements.

## Edge cases
- Changing the root type (`div` → `section`) or root kind (element → string).
- The same handler function passed again (no-op) versus a new inline arrow on every patch (swap listeners without leaking).
- An attribute going from a value to `false` / `null` (remove it), and from `false` to `true` (set it to `""`).
- `0` as a child renders `"0"`. `false` as a child renders nothing.
- Children lists that shrink to empty or grow from empty.
- `value` on an `<input>` the user has typed into: compare against the old vnode or the live DOM? Discuss.

## Follow-ups
1. **Keyed children.** When children have keys, match them by key instead of by index. Reordering, inserting at the start and removing from the middle must move the existing DOM nodes (`insertBefore`) instead of recreating or re-texting them. How few moves can you get away with? (React uses a simple "last placed index" heuristic, and some libraries use a longest increasing subsequence.)
2. **Function components.** Allow `type` to be a function `(props) => VNode`. How does `patch` decide whether two component vnodes are "the same"?
3. **Style objects.** Support `style: { color: 'red', fontSize: '12px' }`, removing only the properties that are no longer present.
4. **Event delegation.** Instead of one listener per element, register a single listener per event type on the container and dispatch to handlers stored on the nodes. What are the trade-offs?
5. **Batching.** Add a `createApp(view, container)` with `setState` that schedules a single `patch` per microtask no matter how many updates happen.

## Concepts covered
Virtual nodes as plain data · children normalization · reconciliation by type and position · attributes vs properties · listener bookkeeping · keyed diffing · measuring minimality with `MutationObserver`.

Related: S34 DOM traversal · S29 deepClone & deepEqual · S35 Transactional KV store.
