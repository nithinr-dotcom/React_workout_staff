import type { HighlighterProps, Segment } from './types';
import styles from './Solution.module.css';

// ⬇ Delete this line when you start. Tests for this task are skipped while it exists.
export const NOT_STARTED = true;

export function highlight(text: string, queries: string[]): Segment[] {
  // Your implementation here. Requirements are in README.md.
  void text;
  void queries;
  throw new Error('highlight: not implemented');
}

/** Follow-up 2. */
export function highlightInDom(root: Element, queries: string[]): number {
  void root;
  void queries;
  throw new Error('highlightInDom: not implemented');
}

export default function Highlighter({ text, query }: HighlighterProps) {
  void query;
  return <span className={styles.root}>{text}</span>;
}
