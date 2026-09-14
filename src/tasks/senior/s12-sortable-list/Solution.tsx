import type { SortableListProps } from './types';
import styles from './Solution.module.css';

// ⬇ Delete this line when you start. Tests for this task are skipped while it exists.
export const NOT_STARTED = true;

export default function SortableList({ items, onReorder, label = 'Sortable list' }: SortableListProps) {
  // Your implementation here. Requirements are in README.md.
  void onReorder;
  return (
    <div className={styles.root}>
      {label} with {items.length} items: start coding in Solution.tsx
    </div>
  );
}
