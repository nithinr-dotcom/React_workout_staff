import type { TransferListProps } from './types';
import styles from './Solution.module.css';

// ⬇ Delete this line when you start. Tests for this task are skipped while it exists.
export const NOT_STARTED = true;

export default function TransferList({ leftItems, rightItems, leftTitle = 'Available', rightTitle = 'Selected' }: TransferListProps) {
  // Your implementation here. Requirements are in README.md.
  return (
    <div className={styles.root}>
      TransferList ({leftTitle}: {leftItems.length}, {rightTitle}: {rightItems.length}): start coding in Solution.tsx
    </div>
  );
}
