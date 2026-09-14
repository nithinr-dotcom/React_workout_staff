import type { NestedCommentsProps } from './types';
import styles from './Solution.module.css';

// ⬇ Delete this line when you start. Tests for this task are skipped while it exists.
export const NOT_STARTED = true;

export default function NestedComments({ initialComments, currentUser, now }: NestedCommentsProps) {
  // Your implementation here. Requirements are in README.md.
  void currentUser;
  void now;
  return (
    <div className={styles.root}>
      Nested comments with {initialComments.length} top-level threads: start coding in Solution.tsx
    </div>
  );
}
