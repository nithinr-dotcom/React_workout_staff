import type { PollWidgetProps } from './types';
import styles from './Solution.module.css';

// ⬇ Delete this line when you start. Tests for this task are skipped while it exists.
export const NOT_STARTED = true;

export default function PollWidget({ pollId, question, options }: PollWidgetProps) {
  // Your implementation here. Requirements are in README.md.
  void pollId;
  return (
    <div className={styles.root}>
      PollWidget “{question}” with {options.length} options: start coding in Solution.tsx
    </div>
  );
}
