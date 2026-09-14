// ⬇ Delete this line when you start. Tests for this task are skipped while it exists.
export const NOT_STARTED = true;

// Your implementation here. Requirements are in README.md.
// Do not use querySelector, querySelectorAll, getElementsByClassName, getElementsByTagName,
// matches, closest, TreeWalker or NodeIterator in the base functions.

export function getElementsByClassName(root: Element, classNames: string): Element[] {
  void root;
  void classNames;
  throw new Error('getElementsByClassName: not implemented');
}

export function getElementsByStyle(root: Element, property: string, value: string): Element[] {
  void root;
  void property;
  void value;
  throw new Error('getElementsByStyle: not implemented');
}

export function findCorrespondingNode(rootA: Node, rootB: Node, nodeA: Node): Node | null {
  void rootA;
  void rootB;
  void nodeA;
  throw new Error('findCorrespondingNode: not implemented');
}

/** Follow-up 1. */
export function getCssSelector(element: Element, root?: ParentNode): string {
  void element;
  void root;
  throw new Error('getCssSelector: not implemented');
}
