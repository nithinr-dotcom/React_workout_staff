import type { LRUCacheLike, LRUCacheOptions, Memoized, MemoizeOptions } from './types';

// ⬇ Delete this line when you start. Tests for this task are skipped while it exists.
export const NOT_STARTED = true;

export class LRUCache<K, V> implements LRUCacheLike<K, V> {
  constructor(capacity: number, options: LRUCacheOptions<K, V> = {}) {
    // Your implementation here. Requirements are in README.md.
    void capacity;
    void options;
  }

  get(key: K): V | undefined {
    void key;
    throw new Error('LRUCache.get: not implemented');
  }

  put(key: K, value: V): void {
    void key;
    void value;
    throw new Error('LRUCache.put: not implemented');
  }

  has(key: K): boolean {
    void key;
    throw new Error('LRUCache.has: not implemented');
  }

  delete(key: K): boolean {
    void key;
    throw new Error('LRUCache.delete: not implemented');
  }

  clear(): void {
    throw new Error('LRUCache.clear: not implemented');
  }

  get size(): number {
    throw new Error('LRUCache.size: not implemented');
  }

  keys(): K[] {
    throw new Error('LRUCache.keys: not implemented');
  }
}

export function memoize<Args extends unknown[], R>(
  fn: (...args: Args) => R,
  options: MemoizeOptions<Args> = {},
): Memoized<Args, R> {
  void fn;
  void options;
  throw new Error('memoize: not implemented');
}
