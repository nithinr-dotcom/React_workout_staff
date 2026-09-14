import type { OtpInputProps } from './types';
import styles from './Solution.module.css';

// ⬇ Delete this line when you start. Tests for this task are skipped while it exists.
export const NOT_STARTED = true;

export default function OtpInput({ length = 6, onComplete, onChange, autoFocus = false, disabled = false }: OtpInputProps) {
  // Your implementation here. Requirements are in README.md.
  void onComplete;
  void onChange;
  void autoFocus;
  void disabled;
  return <div className={styles.root}>OTP input with {length} boxes: start coding in Solution.tsx</div>;
}
