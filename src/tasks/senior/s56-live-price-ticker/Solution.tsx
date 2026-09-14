import type { PriceTickerProps } from './types';
import styles from './Solution.module.css';

// ⬇ Delete this line when you start. Tests for this task are skipped while it exists.
export const NOT_STARTED = true;

export default function PriceTicker({ instruments, subscribe, currency = 'USD' }: PriceTickerProps) {
  // Your implementation here. Requirements are in README.md.
  void subscribe;
  void currency;
  return <div className={styles.root}>Price ticker for {instruments.length} instruments: start coding in Solution.tsx</div>;
}
