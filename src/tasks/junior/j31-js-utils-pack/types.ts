export interface ListFormatOptions {
  /** Show at most this many items, then "and N other(s)". Ignored unless it is a positive integer smaller than the item count. */
  length?: number;
  /** Remove duplicate items before formatting. */
  unique?: boolean;
  /** Sort items alphabetically before formatting. */
  sorted?: boolean;
}

export type AnyFn = (this: any, ...args: any[]) => any;

/** The subset of the Web Storage API the expiring storage needs. `localStorage` satisfies it. */
export type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export interface ExpiringStorage {
  /** Stores a JSON-serialisable `value`. With `ttlMs`, the entry expires `ttlMs` ms after this call. */
  setItem(key: string, value: unknown, ttlMs?: number): void;
  /** The stored value, or `null` when missing or expired. Expired entries are removed from the storage. */
  getItem<T = unknown>(key: string): T | null;
  removeItem(key: string): void;
}

export interface JsUtilsModule {
  listFormat(items: readonly string[], options?: ListFormatOptions): string;

  /** Calls `fn` on the first call only; every call returns the first call's result. */
  once<F extends AnyFn>(fn: F): (...args: Parameters<F>) => ReturnType<F>;

  /** Calls `fn` on the first two calls only; odd calls return the 1st result, even calls return the 2nd. */
  onlyTwice<F extends AnyFn>(fn: F): (...args: Parameters<F>) => ReturnType<F>;

  /** Follow-up 3: calls `fn` on the first `n` calls; call k returns the result of call ((k - 1) % n) + 1. */
  onlyN<F extends AnyFn>(fn: F, n: number): (...args: Parameters<F>) => ReturnType<F>;

  /** Returns a new, uniformly shuffled copy of `arr`. `random()` returns a number in [0, 1). */
  shuffle<T>(arr: readonly T[], random?: () => number): T[];

  createExpiringStorage(storage?: StorageLike, now?: () => number): ExpiringStorage;
}
