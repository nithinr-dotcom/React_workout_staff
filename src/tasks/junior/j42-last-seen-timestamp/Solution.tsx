import type { DateInput, LastSeenProps } from './types';
import styles from './Solution.module.css';

// ⬇ Delete this line when you start. Tests for this task are skipped while it exists.
export const NOT_STARTED = true;

export function formatLastSeen(date: DateInput, now: Date | number): string {
  // Your implementation here. Requirements are in README.md.
  void date;
  void now;
  throw new Error('formatLastSeen: not implemented');
}

export default function LastSeen({ date, now = Date.now }: LastSeenProps) {
  // Your implementation here. Requirements are in README.md.
  void date;
  void now;
  return <div className={styles.root}>LastSeen: start coding in Solution.tsx</div>;
}
