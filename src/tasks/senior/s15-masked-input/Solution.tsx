import type { MaskedInputProps } from './types';
import styles from './Solution.module.css';

// ⬇ Delete this line when you start. Tests for this task are skipped while it exists.
export const NOT_STARTED = true;

export default function MaskedInput({ label, mask, defaultValue, onChange, placeholder, autoComplete }: MaskedInputProps) {
  // Your implementation here. Requirements are in README.md.
  void defaultValue;
  void onChange;
  void placeholder;
  void autoComplete;
  return (
    <div className={styles.root}>
      {label} ({mask}): start coding in Solution.tsx
    </div>
  );
}
