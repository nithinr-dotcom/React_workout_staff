import type { ProgressBarProps } from './types';
import styles from './Solution.module.css';

// ⬇ Delete this line when you start. Tests for this task are skipped while it exists.
export const NOT_STARTED = true;

export default function ProgressBar({ value, label, showValue = true, indeterminate = false }: ProgressBarProps) {
  // Your implementation here. Requirements are in README.md.
  void value;
  void showValue;
  void indeterminate;
  return <div className={styles.root}>ProgressBar "{label}": start coding in Solution.tsx</div>;
}
