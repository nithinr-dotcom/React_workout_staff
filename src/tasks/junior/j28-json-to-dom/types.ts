export type EventHandler = (event: Event) => void;

export type Props = Record<string, unknown> & {
  className?: string;
  htmlFor?: string;
  style?: Partial<Record<string, string>>;
};

export interface VElement {
  /** A lowercase HTML tag name, e.g. "div", "button". */
  type: string;
  props?: Props | null;
  children?: VNode[];
}

/** Strings and numbers become text nodes. `null`, `undefined` and booleans render nothing. */
export type VNode = VElement | string | number | boolean | null | undefined;

export interface RendererModule {
  /** Replaces the contents of `container` with the DOM built from `vnode`. Returns the created node (or `null` when nothing is rendered). */
  render(vnode: VNode, container: Element): Node | null;

  /** Follow-up 1: converts a DOM node back into a vnode. */
  serialize(node: Node): VNode;
}
