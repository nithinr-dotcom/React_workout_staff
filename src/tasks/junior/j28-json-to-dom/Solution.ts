import type { VNode } from './types';

// ⬇ Delete this line when you start. Tests for this task are skipped while it exists.
export const NOT_STARTED = true;

// Your implementation here. Requirements are in README.md.

export function render(vnode: VNode, container: Element): Node | null {
  void vnode;
  void container;
  throw new Error('render: not implemented');
}

/** Follow-up 1. */
export function serialize(node: Node): VNode {
  void node;
  throw new Error('serialize: not implemented');
}
