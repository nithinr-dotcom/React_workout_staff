import type { TransactionalStore } from './types';

// ⬇ Delete this line when you start. Tests for this task are skipped while it exists.
export const NOT_STARTED = true;

export function createStore(): TransactionalStore {
  // Your implementation here. Requirements are in README.md.
  return {
    get(key) {
      void key;
      throw new Error('get: not implemented');
    },
    set(key, value) {
      void key;
      void value;
      throw new Error('set: not implemented');
    },
    delete(key) {
      void key;
      throw new Error('delete: not implemented');
    },
    count(value) {
      void value;
      throw new Error('count: not implemented');
    },
    begin() {
      throw new Error('begin: not implemented');
    },
    commit() {
      throw new Error('commit: not implemented');
    },
    rollback() {
      throw new Error('rollback: not implemented');
    },
    depth() {
      throw new Error('depth: not implemented');
    },
  };
}

/** Follow-up 1. */
export function execute(store: TransactionalStore, line: string): string | null {
  void store;
  void line;
  throw new Error('execute: not implemented');
}
