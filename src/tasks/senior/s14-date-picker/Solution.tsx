import type { DatePickerProps } from './types';
import styles from './Solution.module.css';

// ⬇ Delete this line when you start. Tests for this task are skipped while it exists.
export const NOT_STARTED = true;

export default function DatePicker({ label, value, onChange, today, min, max }: DatePickerProps) {
  // Your implementation here. Requirements are in README.md.
  void onChange;
  void today;
  void min;
  void max;
  return (
    <div className={styles.root}>
      {label}: {value ?? 'no date'}. Start coding in Solution.tsx
    </div>
  );
}
