import type { AnyFn, ExpiringStorage, ListFormatOptions, StorageLike } from './types';

// ⬇ Delete this line when you start. Tests for this task are skipped while it exists.
export const NOT_STARTED = true;

// Your implementation here. Requirements are in README.md.

export function listFormat(items: readonly string[], options: ListFormatOptions = {}): string {
  void items;
  void options;
  throw new Error('listFormat: not implemented');
}

export function once<F extends AnyFn>(fn: F): (...args: Parameters<F>) => ReturnType<F> {
  void fn;
  throw new Error('once: not implemented');
}

export function onlyTwice<F extends AnyFn>(fn: F): (...args: Parameters<F>) => ReturnType<F> {
  void fn;
  throw new Error('onlyTwice: not implemented');
}

/** Follow-up 3. */
export function onlyN<F extends AnyFn>(fn: F, n: number): (...args: Parameters<F>) => ReturnType<F> {
  void fn;
  void n;
  throw new Error('onlyN: not implemented');
}

export function shuffle<T>(arr: readonly T[], random: () => number = Math.random): T[] {
  void arr;
  void random;
  throw new Error('shuffle: not implemented');
}

export function createExpiringStorage(storage: StorageLike = localStorage, now: () => number = Date.now): ExpiringStorage {
  void storage;
  void now;
  throw new Error('createExpiringStorage: not implemented');
}
