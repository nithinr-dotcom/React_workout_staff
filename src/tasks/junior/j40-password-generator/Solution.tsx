import type { PasswordGeneratorProps } from './types';
import styles from './Solution.module.css';

// ⬇ Delete this line when you start. Tests for this task are skipped while it exists.
export const NOT_STARTED = true;

export default function PasswordGenerator({ random = Math.random, defaultLength = 12 }: PasswordGeneratorProps) {
  // Your implementation here. Requirements are in README.md.
  void random;
  void defaultLength;
  return <div className={styles.root}>PasswordGenerator: start coding in Solution.tsx</div>;
}
