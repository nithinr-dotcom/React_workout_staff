import type { DataGridProps } from './types';
import styles from './Solution.module.css';

// ⬇ Delete this line when you start. Tests for this task are skipped while it exists.
export const NOT_STARTED = true;

export default function DataGrid({ rows, columns, height, width, rowHeight = 32, overscan = 3, ...aria }: DataGridProps) {
  // Your implementation here. Requirements are in README.md.
  void height;
  void width;
  void rowHeight;
  void overscan;
  void aria;
  return (
    <div className={styles.root}>
      DataGrid with {rows.length} rows × {columns.length} columns: start coding in Solution.tsx
    </div>
  );
}
