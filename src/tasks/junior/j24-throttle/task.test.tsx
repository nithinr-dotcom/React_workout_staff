// ⚠ Unverified: written before the reference solution. If a test looks wrong, trust the README.
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { pickTarget } from '../../../test/target';
import * as Reference from './Reference';
import * as Solution from './Solution';

const { impl, describeTask, describeFollowUp } = pickTarget(Solution, Reference);

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describeTask('throttle', () => {
  it('runs the first call immediately (leading edge)', () => {
    const fn = vi.fn();
    const t = impl.throttle(fn, 100);
    t('a');
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('a');
  });

  it('collapses calls during the window into one trailing call with the latest args', () => {
    const fn = vi.fn();
    const t = impl.throttle(fn, 100);
    t('a');
    vi.advanceTimersByTime(20);
    t('b');
    vi.advanceTimersByTime(20);
    t('c');
    expect(fn.mock.calls).toEqual([['a']]);
    vi.advanceTimersByTime(60);
    expect(fn.mock.calls).toEqual([['a'], ['c']]);
  });

  it('runs a single isolated call only once', () => {
    const fn = vi.fn();
    const t = impl.throttle(fn, 100);
    t();
    vi.advanceTimersByTime(1000);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('never invokes fn more often than once per wait during continuous calls', () => {
    const times: number[] = [];
    const t = impl.throttle(() => {
      times.push(Date.now());
    }, 100);
    const start = Date.now();
    for (let elapsed = 0; elapsed < 1000; elapsed += 10) {
      t();
      vi.advanceTimersByTime(10);
    }
    vi.advanceTimersByTime(200);
    expect(times[0]).toBe(start);
    for (let i = 1; i < times.length; i++) {
      expect(times[i] - times[i - 1]).toBeGreaterThanOrEqual(100);
    }
    // ~1000ms of activity plus a trailing call: roughly 10–11 invocations.
    expect(times.length).toBeGreaterThanOrEqual(9);
    expect(times.length).toBeLessThanOrEqual(12);
  });

  it('becomes idle after a quiet window, so the next call is leading again', () => {
    const fn = vi.fn();
    const t = impl.throttle(fn, 100);
    t(1);
    vi.advanceTimersByTime(500);
    t(2);
    expect(fn.mock.calls).toEqual([[1], [2]]);
  });

  it('forwards `this` and arguments', () => {
    let seenThis: unknown;
    let seenArgs: unknown[] = [];
    const obj = {
      onScroll: impl.throttle(function (this: unknown, x: number, y: number) {
        seenThis = this;
        seenArgs = [x, y];
      }, 50),
    };
    obj.onScroll(3, 4);
    expect(seenThis).toBe(obj);
    expect(seenArgs).toEqual([3, 4]);
  });

  it('leading: false waits for the end of the window', () => {
    const fn = vi.fn();
    const t = impl.throttle(fn, 100, { leading: false });
    t('a');
    t('b');
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(100);
    expect(fn.mock.calls).toEqual([['b']]);
  });

  it('trailing: false drops calls made during the window', () => {
    const fn = vi.fn();
    const t = impl.throttle(fn, 100, { trailing: false });
    t('a');
    t('b');
    vi.advanceTimersByTime(100);
    expect(fn.mock.calls).toEqual([['a']]);
    vi.advanceTimersByTime(50);
    t('c');
    expect(fn.mock.calls).toEqual([['a'], ['c']]);
  });

  it('cancel() drops the pending trailing call, clears timers and resets the window', () => {
    const fn = vi.fn();
    const t = impl.throttle(fn, 100);
    t('a');
    t('b');
    t.cancel();
    expect(vi.getTimerCount()).toBe(0);
    vi.advanceTimersByTime(500);
    expect(fn.mock.calls).toEqual([['a']]);

    fn.mockClear();
    t('c');
    t.cancel();
    t('d');
    expect(fn.mock.calls).toEqual([['c'], ['d']]);
  });

  it('separate throttled functions do not share state', () => {
    const f1 = vi.fn();
    const f2 = vi.fn();
    const t1 = impl.throttle(f1, 100);
    const t2 = impl.throttle(f2, 100);
    t1();
    t2();
    expect(f1).toHaveBeenCalledTimes(1);
    expect(f2).toHaveBeenCalledTimes(1);
  });
});

describeFollowUp(1, 'flush()', () => {
  it('runs the remembered trailing call immediately, once', () => {
    const fn = vi.fn();
    const t = impl.throttle(fn, 100);
    t('a');
    t('b');
    t.flush();
    expect(fn.mock.calls).toEqual([['a'], ['b']]);
    vi.advanceTimersByTime(500);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('does nothing when nothing is remembered', () => {
    const fn = vi.fn();
    const t = impl.throttle(fn, 100);
    t.flush();
    expect(fn).not.toHaveBeenCalled();
    t('a');
    t.flush();
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
