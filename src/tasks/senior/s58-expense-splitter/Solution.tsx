import type { Balances, ExpenseSplitterProps, Settlement } from './types';
import styles from './Solution.module.css';

// ⬇ Delete this line when you start. Tests for this task are skipped while it exists.
export const NOT_STARTED = true;

export function simplifyDebts(balances: Balances): Settlement[] {
  // Your implementation here. Requirements are in README.md.
  void balances;
  throw new Error('simplifyDebts: not implemented');
}

export default function ExpenseSplitter({ currencySymbol = '₹', storageKey }: ExpenseSplitterProps) {
  // Your implementation here. Requirements are in README.md.
  void currencySymbol;
  void storageKey;
  return <div className={styles.root}>Expense splitter: start coding in Solution.tsx</div>;
}
