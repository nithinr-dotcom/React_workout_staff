import type { MortgageCalculatorProps } from './types';
import styles from './Solution.module.css';

// ⬇ Delete this line when you start. Tests for this task are skipped while it exists.
export const NOT_STARTED = true;

export default function MortgageCalculator({ currency = 'USD', locale = 'en-US' }: MortgageCalculatorProps) {
  // Your implementation here. Requirements are in README.md.
  return (
    <div className={styles.root}>
      MortgageCalculator ({currency}, {locale}): start coding in Solution.tsx
    </div>
  );
}
