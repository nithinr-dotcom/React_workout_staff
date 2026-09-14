import type { VirtualizedListProps } from './types';
import styles from './Solution.module.css';

// ⬇ Delete this line when you start. Tests for this task are skipped while it exists.
export const NOT_STARTED = true;

export default function VirtualizedList({
  itemCount,
  itemHeight,
  height,
  renderItem,
  overscan = 3,
  label,
}: VirtualizedListProps) {
  // Your implementation here. Requirements are in README.md.
  void itemHeight;
  void height;
  void renderItem;
  void overscan;
  return (
    <div className={styles.root}>
      {label}: {itemCount} rows. Start coding in Solution.tsx
    </div>
  );
}
