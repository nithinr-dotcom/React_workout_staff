import type { InfiniteFeedProps } from './types';
import styles from './Solution.module.css';

// ⬇ Delete this line when you start. Tests for this task are skipped while it exists.
export const NOT_STARTED = true;

export default function InfiniteFeed({ fetchPage, label = 'Posts', rootMargin = '200px' }: InfiniteFeedProps) {
  // Your implementation here. Requirements are in README.md.
  // Tip: when `fetchPage` is not passed, default to `getFeed` from '../../../mocks/api'.
  void fetchPage;
  void rootMargin;
  return <div className={styles.root}>{label} feed: start coding in Solution.tsx</div>;
}
