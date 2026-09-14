export interface TransactionalStore {
  /** The visible value for `key`, or `null` if it is not set. */
  get(key: string): string | null;
  set(key: string, value: string): void;
  /** Removes `key`. Returns true if it was set. */
  delete(key: string): boolean;
  /** How many keys currently hold exactly `value`. */
  count(value: string): number;
  /** Opens a (possibly nested) transaction. */
  begin(): void;
  /** Merges the innermost transaction into its parent (or into the base store). Throws "NO TRANSACTION" if none is open. */
  commit(): void;
  /** Discards the innermost transaction. Throws "NO TRANSACTION" if none is open. */
  rollback(): void;
  /** Number of open transactions. */
  depth(): number;
}

export interface TransactionalStoreModule {
  createStore(): TransactionalStore;
  /** Follow-up 1: run a text command such as "SET a 10" and return its output line, or null when there is none. */
  execute(store: TransactionalStore, line: string): string | null;
}
