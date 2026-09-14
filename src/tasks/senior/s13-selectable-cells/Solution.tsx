import type { SelectableCellsProps } from './types';
import styles from './Solution.module.css';

// ⬇ Delete this line when you start. Tests for this task are skipped while it exists.
export const NOT_STARTED = true;

export default function SelectableCells({ rows, cols, label = 'Selectable cells', onSelectionChange }: SelectableCellsProps) {
  // Your implementation here. Requirements are in README.md.
  void onSelectionChange;
  return (
    <div className={styles.root}>
      {label}: {rows}×{cols} grid. Start coding in Solution.tsx
    </div>
  );
}
