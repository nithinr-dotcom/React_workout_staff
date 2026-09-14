import type { MemoryGameProps } from './types';
import styles from './Solution.module.css';

// ⬇ Delete this line when you start. Tests for this task are skipped while it exists.
export const NOT_STARTED = true;

export default function MemoryGame({ symbols, shuffle, mismatchDelay = 1000 }: MemoryGameProps) {
  // Your implementation here. Requirements are in README.md.
  void shuffle;
  void mismatchDelay;
  return <div className={styles.root}>MemoryGame with {symbols?.length ?? 8} pairs: start coding in Solution.tsx</div>;
}
