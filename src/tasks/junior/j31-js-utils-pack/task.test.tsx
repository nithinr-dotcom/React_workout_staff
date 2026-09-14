// ⚠ Unverified: written before the reference solution. If a test looks wrong, trust the README.
import { afterEach, expect, it, vi } from 'vitest';
import { pickTarget } from '../../../test/target';
import * as Reference from './Reference';
import * as Solution from './Solution';
import type { StorageLike } from './types';

const { impl, describeTask, describeFollowUp } = pickTarget(Solution, Reference);

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describeTask('listFormat', () => {
  it('formats 0, 1, 2 and many items', () => {
    expect(impl.listFormat([])).toBe('');
    expect(impl.listFormat(['Bob'])).toBe('Bob');
    expect(impl.listFormat(['Bob', 'Alice'])).toBe('Bob and Alice');
    expect(impl.listFormat(['Bob', 'Ben', 'Tim', 'Jane', 'John'])).toBe('Bob, Ben, Tim, Jane and John');
  });

  it('truncates with length, using "other" and "others"', () => {
    const names = ['Bob', 'Ben', 'Tim', 'Jane', 'John'];
    expect(impl.listFormat(names, { length: 3 })).toBe('Bob, Ben, Tim and 2 others');
    expect(impl.listFormat(names, { length: 4 })).toBe('Bob, Ben, Tim, Jane and 1 other');
    expect(impl.listFormat(names, { length: 1 })).toBe('Bob and 4 others');
    expect(impl.listFormat(names, { length: 5 })).toBe('Bob, Ben, Tim, Jane and John');
    expect(impl.listFormat(names, { length: 0 })).toBe('Bob, Ben, Tim, Jane and John');
    expect(impl.listFormat(names, { length: -2 })).toBe('Bob, Ben, Tim, Jane and John');
  });

  it('applies unique and sorted before truncating, ignores empty strings, and does not mutate', () => {
    const names = ['Tim', 'Bob', '', 'Ben', 'Bob', 'Tim'];
    const copy = [...names];
    expect(impl.listFormat(names, { unique: true })).toBe('Tim, Bob and Ben');
    expect(impl.listFormat(names, { sorted: true, unique: true })).toBe('Ben, Bob and Tim');
    expect(impl.listFormat(names, { sorted: true, unique: true, length: 2 })).toBe('Ben, Bob and 1 other');
    expect(impl.listFormat(names, { unique: true, length: 1 })).toBe('Tim and 2 others');
    expect(impl.listFormat(['', ''])).toBe('');
    expect(names).toEqual(copy);
  });
});

describeTask('once / onlyTwice', () => {
  it('once calls fn a single time with the first args and this, caches even an undefined result, and wrappers are independent', () => {
    const fn = vi.fn(function (this: { base: number }, a: number, b: number) {
      return this.base + a + b;
    });
    const obj = { base: 100, add: impl.once(fn) };
    expect(obj.add(1, 2)).toBe(103);
    expect(obj.add(10, 20)).toBe(103);
    expect(obj.add(5, 5)).toBe(103);
    expect(fn).toHaveBeenCalledTimes(1);

    const noop = vi.fn(() => undefined);
    const w1 = impl.once(noop);
    const w2 = impl.once(noop);
    w1();
    w1();
    expect(noop).toHaveBeenCalledTimes(1);
    w2();
    expect(noop).toHaveBeenCalledTimes(2);
  });

  it('onlyTwice alternates between the first and second results', () => {
    const fn = vi.fn((x: string) => `result:${x}`);
    const twice = impl.onlyTwice(fn);
    expect(twice('a')).toBe('result:a');
    expect(twice('b')).toBe('result:b');
    expect(twice('c')).toBe('result:a');
    expect(twice('d')).toBe('result:b');
    expect(twice('e')).toBe('result:a');
    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn.mock.calls).toEqual([['a'], ['b']]);
  });
});

/** mulberry32: a tiny seeded PRNG, so the statistics below are deterministic. */
function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describeTask('shuffle', () => {
  it('returns a new permutation, leaves the input alone, and only uses the injected random', () => {
    const spy = vi.spyOn(Math, 'random');
    const input = [1, 2, 3, 4, 5, 6, 7, 8];
    const out = impl.shuffle(input, seeded(42));
    expect(out).not.toBe(input);
    expect(input).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect([...out].sort((a, b) => a - b)).toEqual(input);
    expect(spy).not.toHaveBeenCalled();

    expect(impl.shuffle([], seeded(1))).toEqual([]);
    expect(impl.shuffle(['only'], seeded(1))).toEqual(['only']);
    expect([...impl.shuffle([1, 1, 2], seeded(3))].sort()).toEqual([1, 1, 2]);
  });

  it('stays in range for random() values of 0 and just below 1', () => {
    for (const r of [0, 0.9999999]) {
      const out = impl.shuffle(['a', 'b', 'c', 'd'], () => r);
      expect([...out].sort()).toEqual(['a', 'b', 'c', 'd']);
    }
  });

  it('is unbiased: every permutation of [1, 2, 3] is equally likely', () => {
    const random = seeded(2024);
    const trials = 60_000;
    const counts = new Map<string, number>();
    for (let i = 0; i < trials; i++) {
      const key = impl.shuffle([1, 2, 3], random).join('');
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    expect([...counts.keys()].sort()).toEqual(['123', '132', '213', '231', '312', '321']);
    const expected = trials / 6;
    for (const count of counts.values()) {
      expect(Math.abs(count - expected)).toBeLessThan(expected * 0.05);
    }
  });
});

function memoryStorage() {
  const map = new Map<string, string>();
  const storage: StorageLike = {
    getItem: (k) => (map.has(k) ? map.get(k)! : null),
    setItem: (k, v) => void map.set(k, String(v)),
    removeItem: (k) => void map.delete(k),
  };
  return { storage, size: () => map.size };
}

describeTask('createExpiringStorage', () => {
  it('stores JSON values and returns null for missing keys', () => {
    const { storage } = memoryStorage();
    const s = impl.createExpiringStorage(storage, () => 0);
    s.setItem('user', { name: 'Ada', tags: ['x'] });
    s.setItem('count', 0);
    s.setItem('flag', false);
    expect(s.getItem('user')).toEqual({ name: 'Ada', tags: ['x'] });
    expect(s.getItem('count')).toBe(0);
    expect(s.getItem('flag')).toBe(false);
    expect(s.getItem('missing')).toBeNull();
  });

  it('expires entries after ttlMs, purges them from storage, and resets the expiry when a key is set again', () => {
    const mem = memoryStorage();
    let time = 1_000;
    const s = impl.createExpiringStorage(mem.storage, () => time);
    s.setItem('otp', '1234', 500);
    s.setItem('forever', 'yes');
    time = 1_499;
    expect(s.getItem('otp')).toBe('1234');
    time = 1_501;
    const sizeBefore = mem.size();
    expect(s.getItem('otp')).toBeNull();
    expect(mem.size()).toBeLessThan(sizeBefore);
    time = 10_000_000;
    expect(s.getItem('forever')).toBe('yes');
    s.removeItem('forever');
    expect(s.getItem('forever')).toBeNull();
    expect(mem.size()).toBe(0);

    time = 0;
    s.setItem('k', 'first', 100);
    time = 90;
    s.setItem('k', 'second', 100);
    time = 150;
    expect(s.getItem('k')).toBe('second');
    time = 191;
    expect(s.getItem('k')).toBeNull();
  });

  it('keeps state in storage, so a new wrapper sees the same entries, and ignores foreign keys', () => {
    const { storage } = memoryStorage();
    let time = 0;
    impl.createExpiringStorage(storage, () => time).setItem('theme', 'dark', 1_000);
    storage.setItem('raw', 'not written by the wrapper');
    const again = impl.createExpiringStorage(storage, () => time);
    expect(again.getItem('theme')).toBe('dark');
    expect(() => again.getItem('raw')).not.toThrow();
    time = 2_000;
    expect(again.getItem('theme')).toBeNull();
  });

  it('defaults to localStorage and Date.now', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-01T00:00:00Z'));
    const s = impl.createExpiringStorage();
    s.setItem('session', { id: 1 }, 60_000);
    expect(localStorage.length).toBeGreaterThan(0);
    vi.advanceTimersByTime(59_000);
    expect(s.getItem('session')).toEqual({ id: 1 });
    vi.advanceTimersByTime(2_000);
    expect(s.getItem('session')).toBeNull();
    expect(localStorage.length).toBe(0);
  });
});

describeFollowUp(3, 'onlyN', () => {
  it('cycles through the first n results', () => {
    let calls = 0;
    const fn = vi.fn(() => ++calls);
    const three = impl.onlyN(fn, 3);
    expect([three(), three(), three(), three(), three(), three(), three()]).toEqual([1, 2, 3, 1, 2, 3, 1]);
    expect(fn).toHaveBeenCalledTimes(3);
  });
});
