// ⚠ Unverified: written before the reference solution. If a test looks wrong, trust the README.
import { afterEach, expect, it, vi } from 'vitest';
import { pickTarget } from '../../../test/target';
import * as Reference from './Reference';
import * as Solution from './Solution';
import type { Subscriber } from './types';

const { impl, describeTask, describeFollowUp } = pickTarget(Solution, Reference);
const { Observable, Subject, map, filter } = impl;

afterEach(() => {
  vi.useRealTimers();
});

/** An observer whose calls are all recorded, in order, in one log. */
function recorder() {
  const log: unknown[] = [];
  return {
    log,
    observer: {
      next: (value: unknown) => log.push(value),
      error: (error: unknown) => log.push({ error }),
      complete: () => log.push('complete'),
    },
  };
}

describeTask('Observable', () => {
  it('delivers values to a next function or an observer object', () => {
    const source = new Observable<number>((subscriber) => {
      subscriber.next(1);
      subscriber.next(2);
      subscriber.complete();
    });

    const values: number[] = [];
    source.subscribe((v) => values.push(v));
    expect(values).toEqual([1, 2]);

    const { log, observer } = recorder();
    source.subscribe(observer);
    expect(log).toEqual([1, 2, 'complete']);

    // A partial observer is fine too.
    expect(() => source.subscribe({ complete: () => {} })).not.toThrow();
  });

  it('is lazy and cold: the subscribe function runs once per subscribe, not at construction', () => {
    const producer = vi.fn((subscriber: Subscriber<string>) => {
      subscriber.next('hello');
    });
    const source = new Observable<string>(producer);
    expect(producer).not.toHaveBeenCalled();
    const a = vi.fn();
    const b = vi.fn();
    source.subscribe(a);
    source.subscribe(b);
    expect(producer).toHaveBeenCalledTimes(2);
    expect(a).toHaveBeenCalledWith('hello');
    expect(b).toHaveBeenCalledWith('hello');
  });

  it('sends nothing after complete or error', () => {
    const { log, observer } = recorder();
    new Observable<number>((subscriber) => {
      subscriber.next(1);
      subscriber.complete();
      subscriber.next(2);
      subscriber.error(new Error('late'));
      subscriber.complete();
    }).subscribe(observer);
    expect(log).toEqual([1, 'complete']);

    const boom = new Error('boom');
    const second = recorder();
    new Observable<number>((subscriber) => {
      subscriber.error(boom);
      subscriber.next(1);
      subscriber.complete();
    }).subscribe(second.observer);
    expect(second.log).toEqual([{ error: boom }]);
  });

  it('unsubscribe stops delivery and runs the teardown exactly once', () => {
    const teardown = vi.fn();
    let emit: (v: number) => void = () => {};
    const source = new Observable<number>((subscriber) => {
      emit = (v) => subscriber.next(v);
      return teardown;
    });
    const next = vi.fn();
    const subscription = source.subscribe(next);
    emit(1);
    subscription.unsubscribe();
    emit(2);
    subscription.unsubscribe();
    expect(next.mock.calls).toEqual([[1]]);
    expect(teardown).toHaveBeenCalledTimes(1);
  });

  it('runs the teardown on complete and on error, even when they happen before the teardown is returned', () => {
    const onComplete = vi.fn();
    let finish: () => void = () => {};
    const sub = new Observable<number>((subscriber) => {
      finish = () => subscriber.complete();
      return onComplete;
    }).subscribe(() => {});
    expect(onComplete).not.toHaveBeenCalled();
    finish();
    expect(onComplete).toHaveBeenCalledTimes(1);
    sub.unsubscribe();
    expect(onComplete).toHaveBeenCalledTimes(1);

    const syncTeardown = vi.fn();
    new Observable<number>((subscriber) => {
      subscriber.error(new Error('sync'));
      return syncTeardown;
    }).subscribe({ error: () => {} });
    expect(syncTeardown).toHaveBeenCalledTimes(1);
  });

  it('turns a throw inside the subscribe function into an error notification', () => {
    const boom = new Error('boom');
    const { log, observer } = recorder();
    expect(() =>
      new Observable<number>((subscriber) => {
        subscriber.next(1);
        throw boom;
      }).subscribe(observer),
    ).not.toThrow();
    expect(log).toEqual([1, { error: boom }]);
  });
});

describeTask('Observable.from / interval / fromEvent', () => {
  it('from(array) emits synchronously then completes; from(promise) emits the value asynchronously', async () => {
    const arr = recorder();
    Observable.from(['a', 'b']).subscribe(arr.observer);
    expect(arr.log).toEqual(['a', 'b', 'complete']);

    const resolved = recorder();
    Observable.from(Promise.resolve(42)).subscribe(resolved.observer);
    expect(resolved.log).toEqual([]);
    await new Promise((r) => setTimeout(r, 0));
    expect(resolved.log).toEqual([42, 'complete']);

    const boom = new Error('boom');
    const rejected = recorder();
    Observable.from(Promise.reject(boom)).subscribe(rejected.observer);
    await new Promise((r) => setTimeout(r, 0));
    expect(rejected.log).toEqual([{ error: boom }]);

    const cancelled = vi.fn();
    Observable.from(Promise.resolve(1)).subscribe(cancelled).unsubscribe();
    await new Promise((r) => setTimeout(r, 0));
    expect(cancelled).not.toHaveBeenCalled();
  });

  it('interval emits 0, 1, 2… per subscriber and stops its timer on unsubscribe', () => {
    vi.useFakeTimers();
    const first = vi.fn();
    const second = vi.fn();
    const source = Observable.interval(100);
    const subA = source.subscribe(first);
    vi.advanceTimersByTime(250);
    const subB = source.subscribe(second);
    vi.advanceTimersByTime(100);
    expect(first.mock.calls).toEqual([[0], [1], [2]]);
    expect(second.mock.calls).toEqual([[0]]);
    subA.unsubscribe();
    subB.unsubscribe();
    vi.advanceTimersByTime(1000);
    expect(first).toHaveBeenCalledTimes(3);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('fromEvent listens only while subscribed', () => {
    const target = new EventTarget();
    const add = vi.spyOn(target, 'addEventListener');
    const source = Observable.fromEvent(target, 'ping');
    expect(add).not.toHaveBeenCalled();

    const next = vi.fn();
    const sub = source.subscribe(next);
    const event = new Event('ping');
    target.dispatchEvent(event);
    target.dispatchEvent(new Event('other'));
    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0]).toBe(event);

    sub.unsubscribe();
    target.dispatchEvent(new Event('ping'));
    expect(next).toHaveBeenCalledTimes(1);
  });
});

describeTask('pipe, map & filter', () => {
  it('chains operators with index, passes complete and error through, and unsubscribes the source', () => {
    const { log, observer } = recorder();
    Observable.from([1, 2, 3, 4, 5])
      .pipe(
        filter((n: number) => n % 2 === 1),
        map((n: number, i: number) => `${i}:${n * 10}`),
      )
      .subscribe(observer);
    expect(log).toEqual(['0:10', '1:30', '2:50', 'complete']);

    const boom = new Error('boom');
    const failing = recorder();
    new Observable<number>((s) => s.error(boom)).pipe(map((n: number) => n + 1)).subscribe(failing.observer);
    expect(failing.log).toEqual([{ error: boom }]);

    const teardown = vi.fn();
    const sub = new Observable<number>(() => teardown).pipe(map((n: number) => n)).subscribe(() => {});
    sub.unsubscribe();
    expect(teardown).toHaveBeenCalledTimes(1);

    const source = Observable.from([1]);
    const values: number[] = [];
    source.pipe().subscribe((v: number) => values.push(v));
    expect(values).toEqual([1]);
  });
});

describeTask('Subject', () => {
  it('multicasts: every current subscriber gets each value, late subscribers only get later values', () => {
    const subject = new Subject<number>();
    const a = vi.fn();
    const b = vi.fn();
    const subA = subject.subscribe(a);
    subject.next(1);
    subject.subscribe(b);
    subject.next(2);
    subA.unsubscribe();
    subject.next(3);
    expect(a.mock.calls).toEqual([[1], [2]]);
    expect(b.mock.calls).toEqual([[2], [3]]);

    const doubled = vi.fn();
    subject.pipe(map((n: number) => n * 2)).subscribe(doubled);
    subject.next(4);
    expect(doubled).toHaveBeenCalledWith(8);
  });

  it('complete reaches everyone, ignores later values, and completes late subscribers immediately', () => {
    const subject = new Subject<string>();
    const first = recorder();
    const second = recorder();
    subject.subscribe(first.observer);
    subject.subscribe(second.observer);
    subject.next('x');
    subject.complete();
    subject.next('ignored');
    expect(first.log).toEqual(['x', 'complete']);
    expect(second.log).toEqual(['x', 'complete']);

    const late = recorder();
    subject.subscribe(late.observer);
    expect(late.log).toEqual(['complete']);
  });
});

describeFollowUp(1, 'BehaviorSubject', () => {
  it('replays the current value to each new subscriber and exposes getValue()', () => {
    const { BehaviorSubject } = impl;
    const state = new BehaviorSubject('idle');
    const a = vi.fn();
    state.subscribe(a);
    expect(a.mock.calls).toEqual([['idle']]);
    state.next('loading');
    expect(state.getValue()).toBe('loading');
    const b = vi.fn();
    state.subscribe(b);
    expect(b.mock.calls).toEqual([['loading']]);
    state.next('done');
    expect(a.mock.calls).toEqual([['idle'], ['loading'], ['done']]);
  });
});

describeFollowUp(2, 'switchMap', () => {
  it('unsubscribes the previous inner observable when a new value arrives (typeahead)', () => {
    vi.useFakeTimers();
    const { switchMap } = impl;
    const queries = new Subject<string>();
    const cancelled: string[] = [];
    const fakeSearch = (q: string) =>
      new Observable<string>((subscriber) => {
        let done = false;
        const id = setTimeout(() => {
          done = true;
          subscriber.next(`results for ${q}`);
          subscriber.complete();
        }, 100);
        return () => {
          clearTimeout(id);
          if (!done) cancelled.push(q);
        };
      });

    const { log, observer } = recorder();
    queries.pipe(switchMap((q: string) => fakeSearch(q))).subscribe(observer);
    queries.next('r');
    vi.advanceTimersByTime(50);
    queries.next('re');
    vi.advanceTimersByTime(50);
    queries.next('rea');
    vi.advanceTimersByTime(100);
    expect(log).toEqual(['results for rea']);
    expect(cancelled).toEqual(['r', 're']);

    queries.complete();
    expect(log).toEqual(['results for rea', 'complete']);
  });
});
