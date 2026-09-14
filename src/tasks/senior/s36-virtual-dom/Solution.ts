import type { Child, Props, VElement, VNode } from './types';

// ⬇ Delete this line when you start. Tests for this task are skipped while it exists.
export const NOT_STARTED = true;

// Your implementation here. Requirements are in README.md.

export function h(type: string, props: Props | null, ...children: Child[]): VElement {
  void type;
  void props;
  void children;
  throw new Error('h: not implemented');
}

export function render(vnode: VNode, container: Element): Node {
  void vnode;
  void container;
  throw new Error('render: not implemented');
}

export function patch(container: Element, oldVNode: VNode, newVNode: VNode): Node {
  void container;
  void oldVNode;
  void newVNode;
  throw new Error('patch: not implemented');
}
