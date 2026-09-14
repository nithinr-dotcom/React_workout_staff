import type { StarRatingProps } from './types';
import styles from './Solution.module.css';

// ⬇ Delete this line when you start. Tests for this task are skipped while it exists.
export const NOT_STARTED = true;

export default function StarRating({ max = 5, value, defaultValue = 0, onChange, readOnly = false, label = 'Rating' }: StarRatingProps) {
  // Your implementation here. Requirements are in README.md.
  void value;
  void defaultValue;
  void onChange;
  void readOnly;
  return (
    <div className={styles.root}>
      {label} ({max} stars): start coding in Solution.tsx
    </div>
  );
}
