// ⚠ Unverified: written before the reference solution. If a test looks wrong, trust the README.
import { afterEach, expect, it, vi } from 'vitest';
import { pickTarget } from '../../../test/target';
import * as Reference from './Reference';
import * as Solution from './Solution';

const { impl, describeTask, describeFollowUp } = pickTarget(Solution, Reference);

afterEach(() => {
  vi.useRealTimers();
});

function manualClock(start = 0) {
  const clock = { t: start, now: () => clock.t };
  return clock;
}

/** Observes a promise without leaving its rejection unhandled. */
function track<T>(promise: Promise<T>) {
  const state: { status: 'pending' | 'fulfilled' | 'rejected'; value?: T; error?: unknown } = { status: 'pending' };
  promise.then(
    (value) => {
      state.status = 'fulfilled';
      state.value = value;
    },
    (error) => {
      state.status = 'rejected';
      state.error = error;
    },
  );
  return state;
}

/** Lets a wrapped call start (it may be deferred to a zero-delay timer), then returns it for awaiting. */
async function settled<T>(promise: Promise<T>) {
  promise.catch(() => {});
  await vi.advanceTimersByTimeAsync(0);
  return promise;
}

describeTask('createHitCounter', () => {
  it('counts a hit while now - t < windowMs, and drops it at exactly windowMs', () => {
    const clock = manualClock(1000);
    const counter = impl.createHitCounter(300, clock.now);
    expect(counter.count()).toBe(0);
    counter.hit();
    clock.t = 1299;
    expect(counter.count()).toBe(1);
    clock.t = 1300;
    expect(counter.count()).toBe(0);
  });

  it('rolls continuously: each hit expires on its own schedule', () => {
    const clock = manualClock(0);
    const counter = impl.createHitCounter(1000, clock.now);
    counter.hit(); // t = 0
    clock.t = 500;
    counter.hit();
    counter.hit();
    clock.t = 900;
    counter.hit();
    expect(counter.count()).toBe(4);
    clock.t = 1000;
    expect(counter.count()).toBe(3);
    clock.t = 1500;
    expect(counter.count()).toBe(1);
    clock.t = 1899;
    expect(counter.count()).toBe(1);
    clock.t = 1900;
    expect(counter.count()).toBe(0);
  });

  it('handles large bursts at the same timestamp', () => {
    const clock = manualClock(0);
    const counter = impl.createHitCounter(5 * 60_000, clock.now);
    for (let i = 0; i < 100_000; i++) counter.hit();
    clock.t = 1;
    for (let i = 0; i < 5; i++) counter.hit();
    expect(counter.count()).toBe(100_005);
    clock.t = 5 * 60_000;
    expect(counter.count()).toBe(5);
    clock.t = 5 * 60_000 + 1;
    expect(counter.count()).toBe(0);
  });

  it('works after a long idle gap, and counters are independent', () => {
    const clock = manualClock(0);
    const a = impl.createHitCounter(100, clock.now);
    const b = impl.createHitCounter(100, clock.now);
    a.hit();
    a.hit();
    clock.t = 10_000_000;
    expect(a.count()).toBe(0);
    a.hit();
    expect(a.count()).toBe(1);
    expect(b.count()).toBe(0);
  });
});

describeTask('createRateLimiter: tryAcquire', () => {
  it('validates its options', () => {
    expect(() => impl.createRateLimiter({ limit: 0, windowMs: 1000 })).toThrow(RangeError);
    expect(() => impl.createRateLimiter({ limit: 1.5, windowMs: 1000 })).toThrow(RangeError);
    expect(() => impl.createRateLimiter({ limit: 2, windowMs: 0 })).toThrow(RangeError);
  });

  it('allows up to limit acquisitions, and failed attempts use nothing', () => {
    const clock = manualClock(0);
    const limiter = impl.createRateLimiter({ limit: 3, windowMs: 1000, now: clock.now });
    expect([limiter.tryAcquire(), limiter.tryAcquire(), limiter.tryAcquire()]).toEqual([true, true, true]);
    for (let i = 0; i < 10; i++) expect(limiter.tryAcquire()).toBe(false);
    clock.t = 1000; // the three acquisitions from t = 0 expire together; the failures never counted
    expect([limiter.tryAcquire(), limiter.tryAcquire(), limiter.tryAcquire(), limiter.tryAcquire()]).toEqual([
      true,
      true,
      true,
      false,
    ]);
  });

  it('uses a sliding window, not fixed buckets', () => {
    const clock = manualClock(0);
    const limiter = impl.createRateLimiter({ limit: 2, windowMs: 1000, now: clock.now });
    expect(limiter.tryAcquire()).toBe(true); // t = 0
    clock.t = 600;
    expect(limiter.tryAcquire()).toBe(true); // t = 600
    clock.t = 999;
    expect(limiter.tryAcquire()).toBe(false);
    clock.t = 1000;
    expect(limiter.tryAcquire()).toBe(true); // slot from t = 0 freed; log is now [600, 1000]
    clock.t = 1599;
    expect(limiter.tryAcquire()).toBe(false);
    clock.t = 1600;
    expect(limiter.tryAcquire()).toBe(true);
    expect(limiter.tryAcquire()).toBe(false);
  });
});

describeTask('createRateLimiter: wrap', () => {
  it("'reject' mode: calls fn with its arguments, then rejects with RateLimitError and retryAfterMs", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const fn = vi.fn((a: number, b: number) => a + b);
    const limiter = impl.createRateLimiter({ limit: 2, windowMs: 1000, now: () => Date.now() });
    const add = limiter.wrap(fn);

    await expect(settled(add(1, 2))).resolves.toBe(3);
    await vi.advanceTimersByTimeAsync(400);
    await expect(settled(add(3, 4))).resolves.toBe(7);
    expect(fn.mock.calls).toEqual([
      [1, 2],
      [3, 4],
    ]);

    await vi.advanceTimersByTimeAsync(100); // t = 500
    const over = track(add(5, 6));
    await vi.advanceTimersByTimeAsync(0);
    expect(over.status).toBe('rejected');
    expect((over.error as Error).name).toBe('RateLimitError');
    expect((over.error as { retryAfterMs: number }).retryAfterMs).toBe(500);
    expect(fn).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(500); // t = 1000
    await expect(settled(add(5, 6))).resolves.toBe(11);
  });

  it('propagates fn errors (sync or async) and still uses the permit', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const syncError = new Error('sync');
    const asyncError = new Error('async');
    const limiter = impl.createRateLimiter({ limit: 2, windowMs: 1000, now: () => Date.now() });
    const throwsSync = limiter.wrap(() => {
      throw syncError;
    });
    const rejects = limiter.wrap(() => Promise.reject(asyncError));

    let result: Promise<unknown> | undefined;
    expect(() => {
      result = throwsSync();
    }).not.toThrow();
    await expect(settled(result!)).rejects.toBe(syncError);
    await expect(settled(rejects())).rejects.toBe(asyncError);
    expect(limiter.tryAcquire()).toBe(false);
  });

  it("'queue' mode: waits for a free permit, runs FIFO at the exact expiry time", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const started: [string, number][] = [];
    const limiter = impl.createRateLimiter({ limit: 2, windowMs: 1000, now: () => Date.now(), onLimit: 'queue' });
    const job = limiter.wrap((name: string) => {
      started.push([name, Date.now()]);
      return name.toUpperCase();
    });

    const a = job('a');
    const b = job('b');
    const c = track(job('c'));
    const d = track(job('d'));
    await vi.advanceTimersByTimeAsync(0);
    expect(started).toEqual([
      ['a', 0],
      ['b', 0],
    ]);
    await expect(Promise.all([a, b])).resolves.toEqual(['A', 'B']);

    await vi.advanceTimersByTimeAsync(300); // t = 300
    const e = track(job('e'));
    await vi.advanceTimersByTimeAsync(699); // t = 999
    expect(started).toHaveLength(2);
    expect(c.status).toBe('pending');

    await vi.advanceTimersByTimeAsync(1); // t = 1000
    expect(started).toEqual([
      ['a', 0],
      ['b', 0],
      ['c', 1000],
      ['d', 1000],
    ]);
    expect(c).toMatchObject({ status: 'fulfilled', value: 'C' });
    expect(d).toMatchObject({ status: 'fulfilled', value: 'D' });

    await vi.advanceTimersByTimeAsync(999); // t = 1999
    expect(e.status).toBe('pending');
    await vi.advanceTimersByTimeAsync(1); // t = 2000
    expect(started[4]).toEqual(['e', 2000]);
    expect(e).toMatchObject({ status: 'fulfilled', value: 'E' });
  });

  it('wrap and tryAcquire share one window', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const fn = vi.fn(() => 'ok');
    const limiter = impl.createRateLimiter({ limit: 2, windowMs: 1000, now: () => Date.now() });
    expect(limiter.tryAcquire()).toBe(true);
    await expect(settled(limiter.wrap(fn)())).resolves.toBe('ok');
    expect(limiter.tryAcquire()).toBe(false);
    const over = track(limiter.wrap(fn)());
    await vi.advanceTimersByTimeAsync(0);
    expect((over.error as Error).name).toBe('RateLimitError');
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describeFollowUp(1, 'token bucket', () => {
  it('starts full, refills continuously and caps at capacity', () => {
    const clock = manualClock(0);
    const bucket = impl.createTokenBucket({ capacity: 5, refillPerSecond: 2, now: clock.now });
    expect(bucket.tokens()).toBe(5);
    expect(bucket.tryRemove(3)).toBe(true);
    expect(bucket.tryRemove()).toBe(true);
    expect(bucket.tryRemove()).toBe(true);
    expect(bucket.tryRemove()).toBe(false);

    clock.t = 250; // 0.5 tokens
    expect(bucket.tokens()).toBeCloseTo(0.5);
    expect(bucket.tryRemove()).toBe(false);
    clock.t = 500; // 1 token
    expect(bucket.tryRemove()).toBe(true);
    expect(bucket.tryRemove()).toBe(false);

    clock.t = 60_000;
    expect(bucket.tokens()).toBe(5);
    expect(bucket.tryRemove(6)).toBe(false);
    expect(bucket.tokens()).toBe(5);
  });
});
