import type { DataTableProps, RowId } from './types';
import styles from './Solution.module.css';

// ⬇ Delete this line when you start. Tests for this task are skipped while it exists.
export const NOT_STARTED = true;

export default function DataTable<Row extends { id: RowId }>({
  columns,
  rows,
  caption,
  filter,
  pageSizeOptions = [10, 25, 50],
  initialPageSize,
}: DataTableProps<Row>) {
  // Your implementation here. Requirements are in README.md.
  void columns;
  void filter;
  void pageSizeOptions;
  void initialPageSize;
  return (
    <div className={styles.root}>
      {caption}: {rows.length} rows. Start coding in Solution.tsx
    </div>
  );
}
