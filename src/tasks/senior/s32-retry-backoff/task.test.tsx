// ⚠ Unverified: written before the reference solution. If a test looks wrong, trust the README.
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { pickTarget } from '../../../test/target';
import * as Reference from './Reference';
import * as Solution from './Solution';

const { impl, describeTask } = pickTarget(Solution, Reference);

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

/** Observes a promise without leaving its rejection unhandled. */
function track<T>(promise: Promise<T>) {
  const state: { status: 'pending' | 'fulfilled' | 'rejected'; value?: T; error?: unknown } = { status: 'pending' };
  const done = promise.then(
    (value) => {
      state.status = 'fulfilled';
      state.value = value;
    },
    (error) => {
      state.status = 'rejected';
      state.error = error;
    },
  );
  return Object.assign(state, { done });
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const nameOf = (error: unknown) => (error as { name?: string }).name;

describeTask('sleep', () => {
  it('resolves after ms', async () => {
    const s = track(impl.sleep(100));
    await vi.advanceTimersByTimeAsync(99);
    expect(s.status).toBe('pending');
    await vi.advanceTimersByTimeAsync(1);
    expect(s.status).toBe('fulfilled');
  });

  it('rejects with AbortError when aborted, clearing its timer', async () => {
    const controller = new AbortController();
    const s = track(impl.sleep(1000, controller.signal));
    await vi.advanceTimersByTimeAsync(10);
    controller.abort();
    await s.done;
    expect(s.status).toBe('rejected');
    expect(nameOf(s.error)).toBe('AbortError');
    expect(vi.getTimerCount()).toBe(0);
  });

  it('rejects immediately for an already-aborted signal', async () => {
    const controller = new AbortController();
    controller.abort();
    const s = track(impl.sleep(1000, controller.signal));
    await s.done;
    expect(nameOf(s.error)).toBe('AbortError');
    expect(vi.getTimerCount()).toBe(0);
  });
});

describeTask('withTimeout', () => {
  it('settles like the promise when it wins, and leaves no timer behind', async () => {
    const d = deferred<string>();
    const s = track(impl.withTimeout(d.promise, 1000));
    await vi.advanceTimersByTimeAsync(999);
    expect(s.status).toBe('pending');
    d.resolve('data');
    await s.done;
    expect(s.value).toBe('data');
    expect(vi.getTimerCount()).toBe(0);

    const boom = new Error('boom');
    const failing = track(impl.withTimeout(Promise.reject(boom), 1000));
    await failing.done;
    expect(failing.error).toBe(boom);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('rejects with TimeoutError after ms', async () => {
    const s = track(impl.withTimeout(new Promise<never>(() => {}), 500));
    await vi.advanceTimersByTimeAsync(499);
    expect(s.status).toBe('pending');
    await vi.advanceTimersByTimeAsync(1);
    expect(s.status).toBe('rejected');
    expect(nameOf(s.error)).toBe('TimeoutError');
  });

  it('rejects with AbortError when the signal aborts first', async () => {
    const controller = new AbortController();
    const s = track(impl.withTimeout(new Promise<never>(() => {}), 500, controller.signal));
    controller.abort();
    await s.done;
    expect(nameOf(s.error)).toBe('AbortError');
    expect(vi.getTimerCount()).toBe(0);
  });
});

describeTask('retry', () => {
  it('resolves with the first successful attempt without waiting', async () => {
    const fn = vi.fn().mockResolvedValue('ok');
    const s = track(impl.retry(fn));
    await vi.advanceTimersByTimeAsync(0);
    expect(s.status).toBe('fulfilled');
    expect(s.value).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('backs off exponentially between attempts and treats sync throws as failures', async () => {
    const fn = vi
      .fn()
      .mockImplementationOnce(() => {
        throw new Error('sync fail');
      })
      .mockRejectedValueOnce(new Error('async fail'))
      .mockResolvedValue('third time lucky');
    const s = track(impl.retry(fn, { retries: 3, baseDelay: 100, factor: 2 }));

    await vi.advanceTimersByTimeAsync(0);
    expect(fn).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(99);
    expect(fn).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1); // t = 100
    expect(fn).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(199);
    expect(fn).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1); // t = 300
    expect(fn).toHaveBeenCalledTimes(3);
    await s.done;
    expect(s.value).toBe('third time lucky');
    expect(fn.mock.calls.map((c) => c[0])).toEqual([1, 2, 3]);
  });

  it('rejects with the last error once retries are exhausted', async () => {
    const errors = [new Error('e1'), new Error('e2'), new Error('e3')];
    const fn = vi
      .fn()
      .mockRejectedValueOnce(errors[0])
      .mockRejectedValueOnce(errors[1])
      .mockRejectedValueOnce(errors[2]);
    const s = track(impl.retry(fn, { retries: 2, baseDelay: 100 }));
    await vi.advanceTimersByTimeAsync(300);
    expect(fn).toHaveBeenCalledTimes(3);
    expect(s.status).toBe('rejected');
    expect(s.error).toBe(errors[2]);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('caps delays at maxDelay and applies jitter with the injected random', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('down'));
    const s = track(
      impl.retry(fn, { retries: 3, baseDelay: 100, factor: 10, maxDelay: 500, jitter: true, random: () => 0.5 }),
    );
    // Delays: min(500, 100) * 0.5 = 50, min(500, 1000) * 0.5 = 250, min(500, 10000) * 0.5 = 250
    await vi.advanceTimersByTimeAsync(49);
    expect(fn).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1); // t = 50
    expect(fn).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(249);
    expect(fn).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1); // t = 300
    expect(fn).toHaveBeenCalledTimes(3);
    await vi.advanceTimersByTimeAsync(250); // t = 550
    expect(fn).toHaveBeenCalledTimes(4);
    await s.done;
    expect(s.status).toBe('rejected');
  });

  it('stops immediately when shouldRetry returns false', async () => {
    const error = new Error('400 bad request');
    const fn = vi.fn().mockRejectedValue(error);
    const shouldRetry = vi.fn(() => false);
    const s = track(impl.retry(fn, { retries: 5, shouldRetry }));
    await vi.advanceTimersByTimeAsync(0);
    expect(s.status).toBe('rejected');
    expect(s.error).toBe(error);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(shouldRetry).toHaveBeenCalledWith(error, 1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('does not call fn when the signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    const fn = vi.fn().mockResolvedValue('never');
    const s = track(impl.retry(fn, { signal: controller.signal }));
    await s.done;
    expect(nameOf(s.error)).toBe('AbortError');
    expect(fn).not.toHaveBeenCalled();
  });

  it('aborting during a backoff wait rejects and prevents further attempts', async () => {
    const controller = new AbortController();
    const fn = vi.fn().mockRejectedValue(new Error('down'));
    const s = track(impl.retry(fn, { retries: 5, baseDelay: 1000, signal: controller.signal }));
    await vi.advanceTimersByTimeAsync(500);
    expect(fn).toHaveBeenCalledTimes(1);
    controller.abort();
    await vi.advanceTimersByTimeAsync(0);
    expect(s.status).toBe('rejected');
    expect(nameOf(s.error)).toBe('AbortError');
    await vi.advanceTimersByTimeAsync(10_000);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('aborting during an in-flight attempt rejects promptly and ignores its result', async () => {
    const controller = new AbortController();
    const d = deferred<string>();
    const fn = vi.fn(() => d.promise);
    const s = track(impl.retry(fn, { signal: controller.signal }));
    await vi.advanceTimersByTimeAsync(0);
    controller.abort();
    await vi.advanceTimersByTimeAsync(0);
    expect(s.status).toBe('rejected');
    expect(nameOf(s.error)).toBe('AbortError');
    d.resolve('too late');
    await vi.advanceTimersByTimeAsync(1000);
    expect(s.status).toBe('rejected');
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
