import type { MasonryItem, MasonryPosition, MasonryProps } from './types';
import styles from './Solution.module.css';

// ⬇ Delete this line when you start. Tests for this task are skipped while it exists.
export const NOT_STARTED = true;

export function computeMasonry(
  items: MasonryItem[],
  columnCount: number,
  columnWidth: number,
  gap: number,
): MasonryPosition[] {
  // Your implementation here. Requirements are in README.md.
  void items;
  void columnCount;
  void columnWidth;
  void gap;
  throw new Error('computeMasonry: not implemented');
}

export default function Masonry({ items, minColumnWidth, columns, gap = 16, width, onLoadMore, hasMore = false, label = 'Photos' }: MasonryProps) {
  // Your implementation here. Requirements are in README.md.
  void minColumnWidth;
  void columns;
  void gap;
  void width;
  void onLoadMore;
  void hasMore;
  return (
    <div className={styles.root}>
      {label}: {items.length} items. Start coding in Solution.tsx
    </div>
  );
}
