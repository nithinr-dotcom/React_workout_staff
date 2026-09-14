export interface DomTraversalModule {
  /**
   * Descendants of `root` (not `root` itself), in document order, that have *every*
   * class in the whitespace-separated `classNames` string.
   */
  getElementsByClassName(root: Element, classNames: string): Element[];

  /**
   * Descendants of `root` (not `root` itself), in document order, whose computed value
   * for the CSS `property` (kebab-case, e.g. "margin-top") equals `value` once both are normalized by the browser.
   */
  getElementsByStyle(root: Element, property: string, value: string): Element[];

  /**
   * `rootA` and `rootB` have identical structure. Returns the node in `rootB` at the same
   * position as `nodeA` in `rootA`, or `null` if `nodeA` is not inside `rootA`.
   */
  findCorrespondingNode(rootA: Node, rootB: Node, nodeA: Node): Node | null;

  /**
   * Follow-up 1. Returns a CSS selector that matches `element` and only `element`
   * when used as `root.querySelector(selector)`. `root` defaults to `element.ownerDocument`.
   */
  getCssSelector(element: Element, root?: ParentNode): string;
}
