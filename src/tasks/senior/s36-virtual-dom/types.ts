export type Props = Record<string, unknown>;

/** An element description. Text is represented by plain strings. */
export interface VElement {
  type: string;
  /** Props without `key`. Never null (an empty object when none were passed). */
  props: Props;
  /** Normalized: flattened, no null/undefined/boolean, numbers converted to strings. */
  children: VNode[];
  /** Taken from `props.key`, else null. */
  key: string | number | null;
}

export type VNode = VElement | string;

/** What `h` accepts as children before normalization. */
export type Child = VNode | number | boolean | null | undefined | Child[];

export interface VirtualDomModule {
  h(type: string, props: Props | null, ...children: Child[]): VElement;
  /** Replaces the container's content with the DOM for `vnode`. Returns the created node. */
  render(vnode: VNode, container: Element): Node;
  /**
   * `container`'s only child is the DOM previously produced for `oldVNode`.
   * Updates it in place to match `newVNode` and returns the node now representing `newVNode`.
   */
  patch(container: Element, oldVNode: VNode, newVNode: VNode): Node;
}
