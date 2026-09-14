/**
 * Receives the unique keys of one batch and resolves with one result per key, in the same order.
 * A result that is an `Error` instance rejects only that key.
 */
export type BatchFn<K, V> = (keys: K[]) => Promise<(V | Error)[]>;

export interface BatcherOptions {
  /** Maximum number of unique keys in one batch. Reaching it flushes immediately. Default: Infinity. */
  maxBatchSize?: number;
  /** How long to collect keys after the first key of a batch arrives, in ms. Default: 0. */
  maxWaitMs?: number;
  /** Follow-up 3: remember results per key across batches. Default: false. */
  cache?: boolean;
}

export interface Batcher<K, V> {
  /** Queues `key` into the current batch and resolves with its value. */
  load(key: K): Promise<V>;
  /** Follow-up 1: loads several keys; resolves with a value or an Error per key, in order. Never rejects for per-key failures. */
  loadMany(keys: K[]): Promise<(V | Error)[]>;
  /** Follow-up 3: seeds the cache for `key` if it isn't cached yet. */
  prime(key: K, value: V): void;
  /** Follow-up 3: forgets the cached result for `key`. */
  clear(key: K): void;
  /** Follow-up 3: forgets every cached result. */
  clearAll(): void;
}

export interface RequestBatcherModule {
  createBatcher<K, V>(batchFn: BatchFn<K, V>, options?: BatcherOptions): Batcher<K, V>;
}
