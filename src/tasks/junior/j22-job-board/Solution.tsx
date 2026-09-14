import type { JobBoardProps } from './types';
import styles from './Solution.module.css';

// ⬇ Delete this line when you start. Tests for this task are skipped while it exists.
export const NOT_STARTED = true;

export default function JobBoard({ pageSize = 6 }: JobBoardProps) {
  // Your implementation here. Requirements are in README.md.
  // Fetch data with `getJobIds` and `getJob` from '../../../mocks/api'.
  void pageSize;
  return <div className={styles.root}>Job Board: start coding in Solution.tsx</div>;
}
