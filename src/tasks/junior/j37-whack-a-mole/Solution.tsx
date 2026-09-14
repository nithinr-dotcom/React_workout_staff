import type { WhackAMoleProps } from './types';
import styles from './Solution.module.css';

// ⬇ Delete this line when you start. Tests for this task are skipped while it exists.
export const NOT_STARTED = true;

export default function WhackAMole({ duration = 30, popInterval = 1000, upTime = 700, random = Math.random }: WhackAMoleProps) {
  // Your implementation here. Requirements are in README.md.
  void popInterval;
  void upTime;
  void random;
  return <div className={styles.root}>Whack-a-Mole ({duration}s): start coding in Solution.tsx</div>;
}
