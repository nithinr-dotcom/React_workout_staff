# JSON → DOM renderer

## Problem statement
Your team receives UI descriptions from a server as JSON-like objects: a tiny virtual DOM. Write `render(vnode, container)`. It builds the real DOM tree with the DOM APIs and puts it into `container`.

```ts
render(
  {
    type: 'button',
    props: { className: 'btn primary', style: { color: 'white' }, onClick: () => alert('hi'), disabled: false },
    children: ['Save ', { type: 'strong', children: [3] }, ' items'],
  },
  document.getElementById('root')!,
);
// <button class="btn primary" style="color: white;">Save <strong>3</strong> items</button>
```

This is a Meta-style "no framework" question. It checks that you know the DOM API beneath React: attributes vs properties, listeners, text nodes, and why `innerHTML` is dangerous.

## Clarifying questions to ask
- Can I build an HTML string and assign it to `innerHTML`? *(No. Use `document.createElement`, `createTextNode`, `setAttribute` and `addEventListener`. Strings from the server must never be parsed as HTML.)*
- Does `render` append to the container or replace its content? *(Replace.)*
- Are style values strings or numbers? Should `px` be added? *(Strings only, used as-is.)*
- Which props are event handlers? *(Keys matching `on` + an uppercase letter whose value is a function, e.g. `onClick` → `click`, `onMouseEnter` → `mouseenter`.)*
- Do I need SVG? *(Not for the base version. It's follow-up 3.)*

## Functional requirements
- [ ] `render(vnode, container)` removes whatever `container` held and inserts the DOM built from `vnode`.
- [ ] It returns the created top-level node, or `null` when `vnode` renders nothing.
- [ ] A **string or number** vnode becomes a text node. Numbers are converted with `String`, so `0` renders `"0"`.
- [ ] A **`null`, `undefined`, `true` or `false`** vnode renders nothing, wherever it appears.
- [ ] An **element** vnode `{ type, props, children }` becomes `document.createElement(type)`, with props applied and children rendered recursively in order. `props` and `children` are optional.
- [ ] Prop rules:
  - [ ] `className` sets the `class` attribute.
  - [ ] `htmlFor` sets the `for` attribute.
  - [ ] `style` is an object of camelCase CSS properties. Each entry is applied to the element's inline style, e.g. `{ backgroundColor: 'red' }`.
  - [ ] `on[A-Z]…` with a function value is attached with `addEventListener`, using the lowercased event name. It is **not** set as an attribute.
  - [ ] `true` sets the attribute with an empty value, e.g. `disabled=""`. `false`, `null` and `undefined` skip the attribute.
  - [ ] Any other prop is set as an attribute with its value converted by `String`, e.g. `id`, `data-*`, `aria-*`, `type`.
- [ ] Text content is always inserted as text. `'<img src=x onerror=alert(1)>'` shows those characters on screen and creates no `<img>`.

## Non-functional requirements
- **Security:** no `innerHTML`, `outerHTML`, `insertAdjacentHTML` or `document.write`.
- **Performance:** build the tree off-document, then insert it into `container` once, not node by node into the live DOM. A `DocumentFragment` is fine when needed.
- Runs in O(number of vnodes).
- Handles a few thousand nodes and a few hundred levels of nesting.

## Constraints
- 40 minutes. Vanilla DOM APIs, no libraries and no React.
- Export `render` (and, for follow-up 1, `serialize`) from `Solution.ts`.

## Data / API contract
```ts
type EventHandler = (event: Event) => void;
type Props = Record<string, unknown> & {
  className?: string;
  htmlFor?: string;
  style?: Partial<Record<string, string>>;
};
interface VElement {
  type: string;          // lowercase HTML tag
  props?: Props | null;
  children?: VNode[];
}
type VNode = VElement | string | number | boolean | null | undefined;

function render(vnode: VNode, container: Element): Node | null;
function serialize(node: Node): VNode; // follow-up 1
```

## Test contract
- Tests render into a fresh `<div>` and inspect it with DOM APIs: `innerHTML` for plain structure, `getAttribute`/`hasAttribute`, `element.style.<prop>`, and `textContent`.
- Events are fired with `element.click()` or `dispatchEvent(new MouseEvent('mouseenter'))`.
- Follow-up tests (`npm run test:followups -- j28`) check `serialize` round-trips, patching on re-render, and the SVG namespace.

## Edge cases
- Children that are `0` (render `"0"`) vs `false` (render nothing), the same trap as `{count && <X/>}` in React.
- An empty `children` array, or `props: null`.
- A `style` value of `''` (clears that property).
- Several handlers on one element (`onClick` and `onKeyDown`), and the same function reused on several elements.
- Unknown or custom tag names like `my-widget`. `createElement` accepts them.

## Follow-ups
1. **Serialize back.** Implement `serialize(node)`, the inverse of `render` for what the DOM can express:
   - Text nodes become strings. Comment nodes and other node types become `null` and are left out of `children`.
   - An element becomes `{ type, props, children }`, where `type` is the lowercase tag name, `props` is always an object and `children` is always an array.
   - `props` contains every attribute: `class` becomes `className`, `for` becomes `htmlFor`, an empty-valued attribute becomes `true`, and `style` becomes a camelCase object read from the element's inline style.
   - Event listeners can't be read back. Why not?
2. **Patch instead of replace.** When `render` is called again on the same container, update the existing DOM instead of rebuilding it. Reuse a node when its type (or text-ness) is unchanged, update changed attributes and text, remove stale attributes, swap old listeners for new ones, and add or remove extra children. The returned top-level node should be the same object when its type is unchanged.
3. **SVG.** Elements inside an `<svg>` must be created with `document.createElementNS('http://www.w3.org/2000/svg', type)`, and the namespace must pass down to descendants. What breaks if you use `createElement('circle')`?
4. **Untrusted input.** The JSON comes from a server you don't fully trust. Which attributes are still dangerous even without `innerHTML`, e.g. `href: 'javascript:…'`, `srcdoc` or `on*` string attributes? Design an allowlist.

## Concepts covered
`createElement`/`createTextNode` · attributes vs properties (`class`/`className`, `for`/`htmlFor`) · `element.style` · `addEventListener` · recursion over a tree · XSS-safe rendering · the idea behind a virtual DOM and reconciliation.

Related: J26 flatten, get & classnames · S-level virtual list / reconciliation discussions · ST-level design system rendering.
