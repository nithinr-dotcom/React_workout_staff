import type { ClockProps } from './types';
import styles from './Solution.module.css';

// ⬇ Delete this line when you start. Tests for this task are skipped while it exists.
export const NOT_STARTED = true;

export default function Clock({ mode, now = () => new Date(), timeZone }: ClockProps) {
  // Your implementation here. Requirements are in README.md.
  void now;
  void timeZone;
  return <div className={styles.root}>Clock ({mode}): start coding in Solution.tsx</div>;
}
