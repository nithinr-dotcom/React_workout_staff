export interface LRUCacheOptions<K, V> {
  /** Called when an entry is evicted because the cache is full. Not called by delete() or clear(). */
  onEvict?: (key: K, value: V) => void;
}

export interface LRUCacheLike<K, V> {
  /** Returns the value and marks the key as most recently used. `undefined` on a miss. */
  get(key: K): V | undefined;
  /** Inserts or updates, marks the key as most recently used, evicts the least recently used entry if over capacity. */
  put(key: K, value: V): void;
  /** Presence check. Does NOT change recency. */
  has(key: K): boolean;
  /** Removes the key. Returns whether it existed. */
  delete(key: K): boolean;
  /** Removes every entry. */
  clear(): void;
  /** Number of entries. */
  readonly size: number;
  /** Keys ordered from least recently used to most recently used. */
  keys(): K[];
}

export interface LRUCacheConstructor {
  new <K, V>(capacity: number, options?: LRUCacheOptions<K, V>): LRUCacheLike<K, V>;
}

export interface MemoizeOptions<Args extends unknown[]> {
  /** Computes the cache key. Default: the first argument. */
  resolver?: (...args: Args) => unknown;
  /** Keep at most this many entries (least recently used evicted). Default: unbounded. */
  maxSize?: number;
  /** Entries older than this many ms (by Date.now()) are recomputed. Default: never expire. */
  ttl?: number;
}

export interface Memoized<Args extends unknown[], R> {
  (...args: Args): R;
  /** Drops every cached entry. */
  clear(): void;
}

export interface MemoizeModule {
  LRUCache: LRUCacheConstructor;
  memoize<Args extends unknown[], R>(fn: (...args: Args) => R, options?: MemoizeOptions<Args>): Memoized<Args, R>;
}
