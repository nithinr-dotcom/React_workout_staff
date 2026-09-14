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

describeTask('debounce', () => {
  it('delays the call until wait ms have passed', () => {
    const fn = vi.fn();
    const d = impl.debounce(fn, 100);
    d();
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(99);
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('restarts the wait on every call and uses the last arguments', () => {
    const fn = vi.fn();
    const d = impl.debounce(fn, 100);
    d('a');
    vi.advanceTimersByTime(50);
    d('b');
    vi.advanceTimersByTime(50);
    d('c');
    vi.advanceTimersByTime(99);
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('c');
  });

  it('forwards `this` of the last call', () => {
    let seenThis: unknown;
    const obj = {
      name: 'obj',
      save: impl.debounce(function (this: unknown) {
        seenThis = this;
      }, 10),
    };
    obj.save();
    vi.advanceTimersByTime(10);
    expect(seenThis).toBe(obj);
  });

  it('wait = 0 is still asynchronous', () => {
    const fn = vi.fn();
    const d = impl.debounce(fn, 0);
    d();
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(0);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('cancel() drops the pending call', () => {
    const fn = vi.fn();
    const d = impl.debounce(fn, 100);
    d();
    d.cancel();
    vi.advanceTimersByTime(500);
    expect(fn).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('flush() invokes immediately with the latest args, once', () => {
    const fn = vi.fn();
    const d = impl.debounce(fn, 100);
    d(1);
    d(2);
    d.flush();
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith(2);
    d.flush();
    vi.advanceTimersByTime(500);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('flush() does nothing when nothing is pending', () => {
    const fn = vi.fn();
    const d = impl.debounce(fn, 100);
    d.flush();
    expect(fn).not.toHaveBeenCalled();
  });

  it('pending() reflects whether a call is scheduled', () => {
    const d = impl.debounce(() => {}, 100);
    expect(d.pending()).toBe(false);
    d();
    expect(d.pending()).toBe(true);
    vi.advanceTimersByTime(100);
    expect(d.pending()).toBe(false);
  });

  it('separate debounced functions do not share state', () => {
    const f1 = vi.fn();
    const f2 = vi.fn();
    const d1 = impl.debounce(f1, 100);
    const d2 = impl.debounce(f2, 100);
    d1();
    vi.advanceTimersByTime(50);
    d2();
    vi.advanceTimersByTime(50);
    expect(f1).toHaveBeenCalledTimes(1);
    expect(f2).not.toHaveBeenCalled();
  });

  it('can be called again after it fires', () => {
    const fn = vi.fn();
    const d = impl.debounce(fn, 100);
    d('x');
    vi.advanceTimersByTime(100);
    d('y');
    vi.advanceTimersByTime(100);
    expect(fn.mock.calls).toEqual([['x'], ['y']]);
  });
});

describeFollowUp(1, 'leading edge', () => {
  it('leading only: fires immediately, ignores the rest of the burst', () => {
    const fn = vi.fn();
    const d = impl.debounce(fn, 100, { leading: true, trailing: false });
    d('a');
    d('b');
    d('c');
    expect(fn.mock.calls).toEqual([['a']]);
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
    d('d');
    expect(fn.mock.calls).toEqual([['a'], ['d']]);
  });

  it('leading + trailing: fires at both ends of a burst, once for a single call', () => {
    const fn = vi.fn();
    const d = impl.debounce(fn, 100, { leading: true, trailing: true });
    d('a');
    d('b');
    vi.advanceTimersByTime(100);
    expect(fn.mock.calls).toEqual([['a'], ['b']]);

    fn.mockClear();
    d('solo');
    vi.advanceTimersByTime(100);
    expect(fn.mock.calls).toEqual([['solo']]);
  });
});

describeFollowUp(2, 'maxWait', () => {
  it('invokes at least every maxWait during continuous calls', () => {
    const fn = vi.fn();
    const d = impl.debounce(fn, 100, { maxWait: 250 });
    for (let t = 0; t < 600; t += 50) {
      d(t);
      vi.advanceTimersByTime(50);
    }
    // continuous calls every 50ms for 600ms → maxWait should have forced 2 calls
    expect(fn.mock.calls.length).toBeGreaterThanOrEqual(2);
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenLastCalledWith(550);
  });
});
