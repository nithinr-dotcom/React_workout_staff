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
  vi.restoreAllMocks();
});

/** Observes a promise without leaving its rejection unhandled. */
function track<T>(promise: Promise<T>) {
  const state: { status: 'pending' | 'fulfilled' | 'rejected'; error?: unknown } = { status: 'pending' };
  const done = promise.then(
    () => {
      state.status = 'fulfilled';
    },
    (error) => {
      state.status = 'rejected';
      state.error = error;
    },
  );
  return Object.assign(state, { done });
}

const nameOf = (error: unknown) => (error as { name?: string }).name;

describeTask('sleep', () => {
  it('resolves after ms, not before', async () => {
    const s = track(impl.sleep(100));
    await vi.advanceTimersByTimeAsync(99);
    expect(s.status).toBe('pending');
    await vi.advanceTimersByTimeAsync(1);
    expect(s.status).toBe('fulfilled');
  });

  it('rejects with an AbortError when the signal is already aborted or aborts while waiting', async () => {
    const already = track(impl.sleep(100, { signal: AbortSignal.abort() }));
    await already.done;
    expect(already.status).toBe('rejected');
    expect(nameOf(already.error)).toBe('AbortError');

    const controller = new AbortController();
    const later = track(impl.sleep(1000, { signal: controller.signal }));
    await vi.advanceTimersByTimeAsync(10);
    controller.abort();
    await later.done;
    expect(later.status).toBe('rejected');
    expect(nameOf(later.error)).toBe('AbortError');
    expect(vi.getTimerCount()).toBe(0);
  });
});

describeTask('mySetInterval / myClearInterval', () => {
  it('calls fn every ms without using the native setInterval', () => {
    const nativeInterval = vi.spyOn(globalThis, 'setInterval');
    const fn = vi.fn();
    const id = impl.mySetInterval(fn, 100);
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(99);
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(fn).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(250);
    expect(fn).toHaveBeenCalledTimes(3);
    expect(nativeInterval).not.toHaveBeenCalled();
    impl.myClearInterval(id);
  });

  it('myClearInterval stops it, also when called from inside fn, and ignores unknown ids', () => {
    const outside = vi.fn();
    const id = impl.mySetInterval(outside, 50);
    vi.advanceTimersByTime(120);
    impl.myClearInterval(id);
    vi.advanceTimersByTime(500);
    expect(outside).toHaveBeenCalledTimes(2);

    let selfId = 0;
    const inside = vi.fn(() => {
      if (inside.mock.calls.length === 3) impl.myClearInterval(selfId);
    });
    selfId = impl.mySetInterval(inside, 10);
    vi.advanceTimersByTime(200);
    expect(inside).toHaveBeenCalledTimes(3);
    expect(vi.getTimerCount()).toBe(0);

    expect(() => impl.myClearInterval(123456)).not.toThrow();
    expect(() => impl.myClearInterval(undefined)).not.toThrow();
  });

  it('does not accumulate drift when callbacks run late', () => {
    // Simulate a busy main thread: every callback moves the wall clock (Date.now / performance.now)
    // 30ms further ahead of the timer queue, so each following timer fires 30ms later than scheduled.
    let lag = 0;
    const clockNow = Date.now.bind(Date);
    const perfNow = performance.now.bind(performance);
    const start = clockNow();
    vi.spyOn(Date, 'now').mockImplementation(() => clockNow() + lag);
    vi.spyOn(performance, 'now').mockImplementation(() => perfNow() + lag);

    const calledAt: number[] = [];
    const id = impl.mySetInterval(() => {
      calledAt.push(Date.now() - start);
      lag += 30;
    }, 100);
    // Advance in small steps so each rescheduled timer is picked up at its own time.
    for (let i = 0; i < 60; i++) vi.advanceTimersByTime(10);
    impl.myClearInterval(id);

    // A single call may be up to 30ms late, but lateness must not add up.
    // A naive `setTimeout(tick, ms)` chain is called at about 100, 230, 360, 490, 620.
    expect(calledAt.length).toBeGreaterThanOrEqual(5);
    calledAt.slice(0, 5).forEach((t, i) => {
      expect(Math.abs(t - (i + 1) * 100)).toBeLessThanOrEqual(35);
    });
  });
});

describeTask('createPausableInterval', () => {
  it('pause keeps the remaining time of the current period and resume continues from there', () => {
    const fn = vi.fn();
    const interval = impl.createPausableInterval(fn, 100);
    vi.advanceTimersByTime(130);
    expect(fn).toHaveBeenCalledTimes(1);

    interval.pause(); // 30ms into the second period, 70ms left
    vi.advanceTimersByTime(1000);
    expect(fn).toHaveBeenCalledTimes(1);

    interval.resume();
    vi.advanceTimersByTime(69);
    expect(fn).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1);
    expect(fn).toHaveBeenCalledTimes(2);
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(3);
    interval.clear();
  });

  it('pause and resume are idempotent, and clear stops it for good', () => {
    const fn = vi.fn();
    const interval = impl.createPausableInterval(fn, 100);
    interval.resume(); // not paused: must not start a second timer
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);

    interval.pause();
    interval.pause();
    vi.advanceTimersByTime(500);
    interval.resume();
    interval.resume();
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(2);

    interval.clear();
    interval.resume();
    vi.advanceTimersByTime(1000);
    expect(fn).toHaveBeenCalledTimes(2);
    expect(vi.getTimerCount()).toBe(0);
  });
});

describeTask('trackedSetTimeout / clearAllTimeouts', () => {
  it('behaves like setTimeout, and clearAllTimeouts cancels every pending tracked timeout', () => {
    const a = vi.fn();
    const b = vi.fn();
    const c = vi.fn();
    impl.trackedSetTimeout(a, 100, 'x', 1);
    impl.trackedSetTimeout(b, 200);
    const cId = impl.trackedSetTimeout(c, 300);
    impl.trackedClearTimeout(cId);

    vi.advanceTimersByTime(100);
    expect(a).toHaveBeenCalledWith('x', 1);

    impl.clearAllTimeouts();
    vi.advanceTimersByTime(1000);
    expect(b).not.toHaveBeenCalled();
    expect(c).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);

    // Tracking keeps working after a clear.
    const d = vi.fn();
    impl.trackedSetTimeout(d, 10);
    vi.advanceTimersByTime(10);
    expect(d).toHaveBeenCalledTimes(1);
  });
});

describeTask('createFakeClock', () => {
  it('starts at startTime, and tick advances now() and runs due timers in time order', () => {
    const clock = impl.createFakeClock(1000);
    expect(clock.now()).toBe(1000);
    const order: string[] = [];
    clock.setTimeout(() => order.push('300'), 300);
    clock.setTimeout(() => order.push('100'), 100);
    clock.setTimeout(() => order.push('100-second'), 100);
    clock.setTimeout((word: string) => order.push(word), 0, 'zero');
    expect(order).toEqual([]);

    clock.tick(150);
    expect(order).toEqual(['zero', '100', '100-second']);
    expect(clock.now()).toBe(1150);
    clock.tick(150);
    expect(order).toEqual(['zero', '100', '100-second', '300']);
    expect(clock.now()).toBe(1300);
    // The fake clock never touches the real (here: vitest-faked) timer queue.
    expect(vi.getTimerCount()).toBe(0);
  });

  it('sets now() to each timer’s due time while it runs', () => {
    const clock = impl.createFakeClock();
    const seen: number[] = [];
    clock.setTimeout(() => seen.push(clock.now()), 40);
    clock.setTimeout(() => seen.push(clock.now()), 10);
    clock.tick(100);
    expect(seen).toEqual([10, 40]);
    expect(clock.now()).toBe(100);
  });

  it('runs timers scheduled during tick when they fall inside the window, in time order', () => {
    const clock = impl.createFakeClock();
    const log: string[] = [];
    clock.setTimeout(() => {
      log.push(`a@${clock.now()}`);
      clock.setTimeout(() => log.push(`a-child@${clock.now()}`), 20); // due at 30
      clock.setTimeout(() => log.push(`a-late@${clock.now()}`), 500); // due at 510
    }, 10);
    clock.setTimeout(() => log.push(`b@${clock.now()}`), 40);
    clock.tick(100);
    expect(log).toEqual(['a@10', 'a-child@30', 'b@40']);
    clock.tick(410);
    expect(log).toEqual(['a@10', 'a-child@30', 'b@40', 'a-late@510']);
  });

  it('clearTimeout cancels pending timers, including from inside another callback', () => {
    const clock = impl.createFakeClock();
    const later = vi.fn();
    const cancelled = vi.fn();
    const cancelledId = clock.setTimeout(cancelled, 50);
    const laterId = clock.setTimeout(later, 80);
    clock.setTimeout(() => clock.clearTimeout(laterId), 60);
    clock.clearTimeout(cancelledId);
    clock.tick(100);
    expect(cancelled).not.toHaveBeenCalled();
    expect(later).not.toHaveBeenCalled();
    expect(() => clock.clearTimeout(undefined)).not.toThrow();
    expect(() => clock.clearTimeout(999)).not.toThrow();

    const ids = new Set([clock.setTimeout(() => {}, 1), clock.setTimeout(() => {}, 1), clock.setTimeout(() => {}, 1)]);
    expect(ids.size).toBe(3);
  });
});

describeFollowUp(1, 'fake clock setInterval', () => {
  it('repeats until cleared, in order with timeouts', () => {
    const clock = impl.createFakeClock();
    const log: string[] = [];
    const id = clock.setInterval(() => log.push(`i@${clock.now()}`), 30);
    clock.setTimeout(() => log.push(`t@${clock.now()}`), 45);
    clock.tick(100);
    expect(log).toEqual(['i@30', 't@45', 'i@60', 'i@90']);
    clock.clearInterval(id);
    clock.tick(100);
    expect(log).toHaveLength(4);
  });
});

describeFollowUp(2, 'runAll with a loop guard', () => {
  it('runs every timer, including newly scheduled ones, and returns the count', () => {
    const clock = impl.createFakeClock();
    let n = 0;
    const step = () => {
      n++;
      if (n < 5) clock.setTimeout(step, 1000);
    };
    clock.setTimeout(step, 1000);
    expect(clock.runAll()).toBe(5);
    expect(clock.now()).toBe(5000);
  });

  it('throws instead of hanging on a timer that reschedules itself forever', () => {
    const clock = impl.createFakeClock();
    const forever = () => clock.setTimeout(forever, 0);
    clock.setTimeout(forever, 0);
    expect(() => clock.runAll()).toThrow();
  });
});
