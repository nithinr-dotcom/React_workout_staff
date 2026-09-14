// ⚠ Unverified: written before the reference solution. If a test looks wrong, trust the README.
import { expect, it, vi } from 'vitest';
import { pickTarget } from '../../../test/target';
import * as Reference from './Reference';
import * as Solution from './Solution';

const { impl, describeTask } = pickTarget(Solution, Reference);

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describeTask('LRUCache', () => {
  it('stores and reads values, tracking size', () => {
    const cache = new impl.LRUCache<string, number>(3);
    expect(cache.size).toBe(0);
    cache.put('a', 1);
    cache.put('b', 2);
    expect(cache.get('a')).toBe(1);
    expect(cache.get('missing')).toBeUndefined();
    expect(cache.has('b')).toBe(true);
    expect(cache.has('missing')).toBe(false);
    expect(cache.size).toBe(2);
  });

  it('evicts the least recently used entry and reports it via onEvict', () => {
    const onEvict = vi.fn();
    const cache = new impl.LRUCache<string, number>(2, { onEvict });
    cache.put('a', 1);
    cache.put('b', 2);
    cache.get('a'); // a is now most recent
    cache.put('c', 3);
    expect(onEvict).toHaveBeenCalledTimes(1);
    expect(onEvict).toHaveBeenCalledWith('b', 2);
    expect(cache.has('b')).toBe(false);
    expect(cache.keys()).toEqual(['a', 'c']);
    expect(cache.size).toBe(2);
  });

  it('updates an existing key without evicting and refreshes its recency', () => {
    const onEvict = vi.fn();
    const cache = new impl.LRUCache<string, number>(2, { onEvict });
    cache.put('a', 1);
    cache.put('b', 2);
    cache.put('a', 10);
    expect(onEvict).not.toHaveBeenCalled();
    expect(cache.get('a')).toBe(10);
    expect(cache.keys()).toEqual(['b', 'a']);
    cache.put('c', 3);
    expect(onEvict).toHaveBeenCalledWith('b', 2);
  });

  it('has() does not change recency', () => {
    const cache = new impl.LRUCache<string, number>(2);
    cache.put('a', 1);
    cache.put('b', 2);
    expect(cache.has('a')).toBe(true);
    cache.put('c', 3);
    expect(cache.has('a')).toBe(false);
    expect(cache.keys()).toEqual(['b', 'c']);
  });

  it('delete() and clear() remove entries without calling onEvict', () => {
    const onEvict = vi.fn();
    const cache = new impl.LRUCache<string, number>(3, { onEvict });
    cache.put('a', 1);
    cache.put('b', 2);
    expect(cache.delete('a')).toBe(true);
    expect(cache.delete('a')).toBe(false);
    expect(cache.size).toBe(1);
    cache.clear();
    expect(cache.size).toBe(0);
    expect(cache.keys()).toEqual([]);
    expect(onEvict).not.toHaveBeenCalled();
  });

  it('throws a RangeError for an invalid capacity', () => {
    expect(() => new impl.LRUCache(0)).toThrow(RangeError);
    expect(() => new impl.LRUCache(-1)).toThrow(RangeError);
    expect(() => new impl.LRUCache(1.5)).toThrow(RangeError);
  });
});

describeTask('memoize', () => {
  it('calls fn once per key (first argument by default), caching falsy results', () => {
    const fn = vi.fn((n: number) => (n === 0 ? undefined : n * 2));
    const m = impl.memoize(fn);
    expect(m(2)).toBe(4);
    expect(m(2)).toBe(4);
    expect(m(0)).toBeUndefined();
    expect(m(0)).toBeUndefined();
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('uses resolver for the key and forwards all arguments and this', () => {
    const fn = vi.fn(function (this: { base: number }, a: number, b: number) {
      return this.base + a + b;
    });
    const obj = { base: 100, sum: impl.memoize(fn, { resolver: (a: number, b: number) => `${a},${b}` }) };
    expect(obj.sum(1, 2)).toBe(103);
    expect(obj.sum(1, 3)).toBe(104);
    expect(obj.sum(1, 2)).toBe(103);
    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenLastCalledWith(1, 3);
  });

  it('bounds the cache with maxSize (LRU)', () => {
    const fn = vi.fn((key: string) => key.toUpperCase());
    const m = impl.memoize(fn, { maxSize: 2 });
    m('a');
    m('b');
    m('a'); // hit, a is most recent
    m('c'); // evicts b
    expect(fn).toHaveBeenCalledTimes(3);
    m('a'); // still cached
    expect(fn).toHaveBeenCalledTimes(3);
    m('b'); // recomputed
    expect(fn).toHaveBeenCalledTimes(4);
  });

  it('recomputes entries older than ttl', () => {
    vi.useFakeTimers();
    const fn = vi.fn((key: string) => `${key}@${Date.now()}`);
    const m = impl.memoize(fn, { ttl: 1000 });
    const first = m('k');
    vi.advanceTimersByTime(999);
    expect(m('k')).toBe(first);
    expect(fn).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1);
    expect(m('k')).not.toBe(first);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('does not cache synchronous throws', () => {
    let fail = true;
    const fn = vi.fn((key: string) => {
      if (fail) throw new Error('nope');
      return key;
    });
    const m = impl.memoize(fn);
    expect(() => m('x')).toThrow('nope');
    fail = false;
    expect(m('x')).toBe('x');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('dedupes concurrent async calls with the same key', async () => {
    const d = deferred<string>();
    const fn = vi.fn((_id: number) => d.promise);
    const m = impl.memoize(fn);
    const p1 = m(1);
    const p2 = m(1);
    expect(p2).toBe(p1);
    expect(fn).toHaveBeenCalledTimes(1);
    d.resolve('user-1');
    await expect(p1).resolves.toBe('user-1');
    expect(m(1)).toBe(p1);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('evicts a rejected promise so the next call retries', async () => {
    const first = deferred<string>();
    const fn = vi.fn().mockReturnValueOnce(first.promise).mockResolvedValueOnce('ok');
    const m = impl.memoize(fn as (id: number) => Promise<string>);
    const p1 = m(1);
    first.reject(new Error('network'));
    await expect(p1).rejects.toThrow('network');
    const p2 = m(1);
    expect(p2).not.toBe(p1);
    await expect(p2).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('a late rejection does not remove a newer entry for the same key', async () => {
    const stale = deferred<string>();
    const fresh = deferred<string>();
    const fn = vi.fn().mockReturnValueOnce(stale.promise).mockReturnValueOnce(fresh.promise);
    const m = impl.memoize(fn as (id: number) => Promise<string>);
    const p1 = m(1);
    const p1Handled = p1.catch(() => 'handled');
    m.clear();
    const p2 = m(1);
    stale.reject(new Error('late'));
    await p1Handled;
    expect(m(1)).toBe(p2);
    fresh.resolve('fresh');
    await expect(p2).resolves.toBe('fresh');
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
