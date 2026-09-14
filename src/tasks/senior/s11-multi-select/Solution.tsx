import type { MultiSelectProps } from './types';
import styles from './Solution.module.css';

// ⬇ Delete this line when you start. Tests for this task are skipped while it exists.
export const NOT_STARTED = true;

export default function MultiSelect({ label, options, value, onChange, placeholder }: MultiSelectProps) {
  // Your implementation here. Requirements are in README.md.
  void value;
  void onChange;
  void placeholder;
  return (
    <div className={styles.root}>
      {label}: {options.length} options. Start coding in Solution.tsx
    </div>
  );
}
