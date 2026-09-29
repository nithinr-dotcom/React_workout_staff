import type { EventHandler, Props, VElement, VNode } from "./types";

const HTML_NS = "http://www.w3.org/1999/xhtml";
const SVG_NS = "http://www.w3.org/2000/svg";

// React-style prop names → real attribute names (and back, for serialize).
const PROP_TO_ATTR: Record<string, string> = { className: "class", htmlFor: "for" };
const ATTR_TO_PROP: Record<string, string> = { class: "className", for: "htmlFor" };

// 1. Listeners can't be read back from the DOM, so we remember which handler
//    we attached for each event on each element. A WeakMap doesn't keep
//    removed elements alive.
const listeners = new WeakMap<Element, Map<string, EventHandler>>();

// The top-level node we rendered into each container (used for patching).
const roots = new WeakMap<Element, Node>();

// ---------- helpers ----------

/** null, undefined, true and false render nothing. 0 and "" DO render. */
function isRenderable(vnode: VNode): vnode is VElement | string | number {
  return vnode !== null && vnode !== undefined && typeof vnode !== "boolean";
}

function isText(vnode: VNode): vnode is string | number {
  return typeof vnode === "string" || typeof vnode === "number";
}

type StyledElement = HTMLElement | SVGElement;

// ---------- render ----------

export function render(vnode: VNode, container: Element): Node | null {
  // 2. Patch (follow-up 2) only if the container still holds exactly the node
  //    we rendered last time. Otherwise start from scratch.
  const previous = roots.get(container);
  const old = previous && container.childNodes.length === 1 && container.firstChild === previous ? previous : null;

  // Rendering into an <svg> (or a child of one) keeps the SVG namespace.
  const ns = container.namespaceURI === SVG_NS && container.localName !== "foreignObject" ? SVG_NS : HTML_NS;

  // 3. A new tree is fully built while still detached from the page, then
  //    inserted in ONE operation: the browser lays out once, not per node.
  const node = update(old, vnode, ns);
  if (node !== old) container.replaceChildren(...(node ? [node] : []));

  if (node) roots.set(container, node);
  else roots.delete(container);
  return node;
}

/**
 * Makes `dom` match `vnode` and returns the resulting node.
 * Reuses `dom` when it's the same kind of node, otherwise creates a new one.
 * With `dom = null` this simply builds a fresh node.
 */
function update(dom: Node | null, vnode: VNode, parentNs: string): Node | null {
  if (!isRenderable(vnode)) return null;

  // 4. Text: createTextNode / .data never parse HTML, so "<img onerror=…>"
  //    from the server shows up as plain characters. That's the XSS defence.
  if (isText(vnode)) {
    const text = String(vnode); // 0 → "0"
    if (dom instanceof Text) {
      if (dom.data !== text) dom.data = text;
      return dom;
    }
    return document.createTextNode(text);
  }

  // 5. <svg> switches to the SVG namespace; its children inherit it.
  //    createElement("circle") would make an unknown HTML element that draws nothing.
  const ns = vnode.type === "svg" ? SVG_NS : parentNs;
  const reusable = dom instanceof Element && dom.localName === vnode.type && dom.namespaceURI === ns;
  const el = reusable ? dom : ns === SVG_NS ? document.createElementNS(SVG_NS, vnode.type) : document.createElement(vnode.type);

  applyProps(el, vnode.props ?? {});
  // Inside <foreignObject> we're back to normal HTML.
  updateChildren(el, vnode.children ?? [], vnode.type === "foreignObject" ? HTML_NS : ns);
  return el;
}

function updateChildren(el: Element, children: VNode[], ns: string) {
  // Skip null/booleans up front so the child indexes line up with the DOM.
  const next = children.filter(isRenderable);

  next.forEach((child, i) => {
    const existing = el.childNodes[i] ?? null;
    const node = update(existing, child, ns)!; // renderable → never null
    if (node === existing) return;
    if (existing) el.replaceChild(node, existing);
    else el.appendChild(node);
  });

  // Remove leftovers from a longer previous render.
  while (el.childNodes.length > next.length) el.lastChild!.remove();
}

// ---------- props ----------

function applyProps(el: Element, props: Props) {
  const attrs = new Map<string, string>();
  const handlers = new Map<string, EventHandler>();
  let style: Props["style"];

  for (const [key, value] of Object.entries(props)) {
    if (key === "style") {
      style = value as Props["style"];
    } else if (/^on[A-Z]/.test(key)) {
      // 6. onClick → "click", onMouseEnter → "mouseenter".
      //    A non-function on* value (e.g. the string "alert(1)") is dropped on
      //    purpose: as an attribute the browser would run it as code.
      if (typeof value === "function") handlers.set(key.slice(2).toLowerCase(), value as EventHandler);
    } else if (value === true) {
      attrs.set(attrName(el, key), ""); // disabled: true → disabled=""
    } else if (value !== false && value !== null && value !== undefined) {
      attrs.set(attrName(el, key), String(value));
    }
    // false / null / undefined → no attribute at all
  }

  // 7. Attributes: drop the ones no longer wanted, then set the changed ones.
  //    (On a fresh element there's nothing to drop, so this is just "set".)
  for (const name of el.getAttributeNames()) {
    if (name !== "style" && !attrs.has(name)) el.removeAttribute(name);
  }
  for (const [name, value] of attrs) {
    if (el.getAttribute(name) !== value) el.setAttribute(name, value);
  }

  applyStyle(el as StyledElement, style);
  applyListeners(el, handlers);
}

function attrName(el: Element, key: string) {
  const name = PROP_TO_ATTR[key] ?? key;
  // HTML lowercases attribute names (tabIndex → tabindex); SVG keeps case (viewBox).
  return el.namespaceURI === HTML_NS ? name.toLowerCase() : name;
}

function applyStyle(el: StyledElement, style: Props["style"]) {
  // Don't create an empty style="" on elements that never had a style.
  if (!style && !el.hasAttribute("style")) return;

  el.style.cssText = ""; // start clean so removed properties disappear
  for (const [prop, value] of Object.entries(style ?? {})) {
    if (!value) continue; // '' (or missing) means "not set"
    // 8. camelCase keys work as properties on el.style (backgroundColor).
    //    CSS variables (--brand) only work through setProperty.
    if (prop.startsWith("--")) el.style.setProperty(prop, value);
    else (el.style as unknown as Record<string, string>)[prop] = value;
  }
  if (el.style.length === 0) el.removeAttribute("style");
}

function applyListeners(el: Element, next: Map<string, EventHandler>) {
  const prev = listeners.get(el) ?? new Map<string, EventHandler>();

  // 9. Real listeners, not the onclick attribute: several per element are
  //    fine, and one function can be shared between many elements.
  //    On re-render, swap only the handlers that actually changed.
  for (const [type, handler] of prev) {
    if (next.get(type) !== handler) el.removeEventListener(type, handler);
  }
  for (const [type, handler] of next) {
    if (prev.get(type) !== handler) el.addEventListener(type, handler);
  }

  if (next.size > 0) listeners.set(el, next);
  else listeners.delete(el);
}

// ---------- follow-up 1: serialize ----------

function toCamelCase(cssName: string) {
  if (cssName.startsWith("--")) return cssName; // CSS variables keep their name
  return cssName.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());
}

export function serialize(node: Node): VNode {
  if (node.nodeType === Node.TEXT_NODE) return (node as Text).data;
  // Comments, processing instructions, etc. have no vnode form.
  if (node.nodeType !== Node.ELEMENT_NODE) return null;

  const el = node as StyledElement;
  const props: Props = {};
  for (const { name, value } of Array.from(el.attributes)) {
    if (name === "style") {
      // Read the parsed inline style, not the raw string.
      const style: Record<string, string> = {};
      for (let i = 0; i < el.style.length; i++) {
        const cssName = el.style[i];
        style[toCamelCase(cssName)] = el.style.getPropertyValue(cssName);
      }
      props.style = style;
    } else {
      // disabled="" came from `true`, so turn it back into true.
      props[ATTR_TO_PROP[name] ?? name] = value === "" ? true : value;
    }
  }

  // 10. Event listeners are NOT here: the DOM has no API to list the
  //     listeners added with addEventListener, so they can't be read back.
  const children = Array.from(el.childNodes)
    .map(serialize)
    .filter((child) => child !== null);

  return { type: el.localName, props, children };
}
