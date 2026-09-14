import type { StopwatchCountdownProps } from './types';
import styles from './Solution.module.css';

// ⬇ Delete this line when you start. Tests for this task are skipped while it exists.
export const NOT_STARTED = true;

export default function StopwatchCountdown({ now = () => performance.now(), onCountdownComplete }: StopwatchCountdownProps) {
  // Your implementation here. Requirements are in README.md.
  void now;
  void onCountdownComplete;
  return <div className={styles.root}>Stopwatch &amp; Countdown: start coding in Solution.tsx</div>;
}
