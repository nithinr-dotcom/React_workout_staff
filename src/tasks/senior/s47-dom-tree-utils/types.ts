export interface TocEntry {
  /** Heading text with whitespace collapsed to single spaces and trimmed. */
  text: string;
  /** 1 for <h1> … 6 for <h6>. */
  level: number;
  /** The heading's own `id` if it has one, otherwise a generated, unique slug. */
  id: string;
  children: TocEntry[];
}

/** Follow-up 1: a plain n-ary tree with no parent pointers. */
export interface TreeNode {
  value: unknown;
  children: TreeNode[];
}

export interface DomTreeUtilsModule {
  /**
   * `rootA` and `rootB` have the same *element* structure (text, comments and whitespace may differ).
   * Returns the element in `rootB` at the same position as `target` in `rootA`.
   * Returns `null` if `target` is not `rootA` or inside it, or if that position doesn't exist in `rootB`.
   */
  findCorrespondingNode(rootA: Element, rootB: Element, target: Element): Element | null;

  /** Nested outline of every <h1>–<h6> inside `root` (descendants only), in document order. Does not modify the DOM. */
  getTableOfContents(root: Element): TocEntry[];

  /** Number of element levels in the tree rooted at `root`. A root with no element children has height 1. No recursion. */
  getTreeHeight(root: Element): number;

  /** Lowercase tag names, one array per level, left to right. `levelOrder(root)[0]` is `[root's tag]`. No recursion. */
  levelOrder(root: Element): string[][];

  /** Follow-up 1. Same position lookup, but in a plain object tree with no parent pointers. */
  findInClone(rootA: TreeNode, rootB: TreeNode, target: TreeNode): TreeNode | null;

  /** Follow-up 2. The next element to the right on the same level (may have a different parent), or `null`. */
  nextRightSibling(root: Element, target: Element): Element | null;
}
