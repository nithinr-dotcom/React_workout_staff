import type { BatchFn, Batcher, BatcherOptions } from './types';

// ⬇ Delete this line when you start. Tests for this task are skipped while it exists.
export const NOT_STARTED = true;

export function createBatcher<K, V>(batchFn: BatchFn<K, V>, options: BatcherOptions = {}): Batcher<K, V> {
  // Your implementation here. Requirements are in README.md.
  // loadMany, prime, clear and clearAll are follow-ups: stub them until you get there.
  void batchFn;
  void options;
  throw new Error('createBatcher: not implemented');
}
