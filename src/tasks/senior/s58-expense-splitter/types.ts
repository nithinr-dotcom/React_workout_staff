import type { ComponentType } from 'react';

/**
 * Net balance per member, in integer minor units (paise).
 * Positive: the member is owed money. Negative: the member owes money.
 */
export type Balances = Record<string, number>;

export interface Settlement {
  /** Member who pays (had a negative balance). */
  from: string;
  /** Member who receives (had a positive balance). */
  to: string;
  /** Positive integer, in paise. */
  amount: number;
}

export interface ExpenseSplitterProps {
  /** Shown before every amount. Default "₹". */
  currencySymbol?: string;
  /** Follow-up 5: when set, members and expenses are saved to and restored from localStorage[storageKey]. */
  storageKey?: string;
}

export interface ExpenseSplitterModule {
  default: ComponentType<ExpenseSplitterProps>;
  simplifyDebts(balances: Balances): Settlement[];
}
