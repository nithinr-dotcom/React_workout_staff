// ⚠ Unverified: written before the reference solution. If a test looks wrong, trust the README.
import { expect, it } from 'vitest';
import { pickTarget } from '../../../test/target';
import * as Reference from './Reference';
import * as Solution from './Solution';

const { impl, describeTask, describeFollowUp } = pickTarget(Solution, Reference);

/** Lets every pending microtask run (and anything they schedule as microtasks). */
const flush = () => new Promise((r) => setTimeout(r, 0));

/** Observes a MyPromise through its own `then`. */
function track<T>(promise: PromiseLike<T>) {
  const state: { status: 'pending' | 'fulfilled' | 'rejected'; value?: T; reason?: unknown } = { status: 'pending' };
  promise.then(
    (value) => {
      state.status = 'fulfilled';
      state.value = value;
    },
    (reason: unknown) => {
      state.status = 'rejected';
      state.reason = reason;
    },
  );
  return state;
}

describeTask('MyPromise', () => {
  it('runs the executor synchronously but handlers as microtasks', async () => {
    const { MyPromise } = impl;
    const log: string[] = [];
    setTimeout(() => log.push('timeout'), 0);
    const p = new MyPromise<string>((resolve) => {
      log.push('executor');
      resolve('value');
    });
    p.then((v) => log.push(`then:${v}`));
    log.push('sync end');
    expect(log).toEqual(['executor', 'sync end']);
    await flush();
    expect(log).toEqual(['executor', 'sync end', 'then:value', 'timeout']);
  });

  it('settles only once and turns an executor throw into a rejection', async () => {
    const { MyPromise } = impl;
    const first = track(
      new MyPromise<number>((resolve, reject) => {
        resolve(1);
        resolve(2);
        reject(new Error('ignored'));
        throw new Error('also ignored');
      }),
    );
    const boom = new Error('boom');
    const thrown = track(
      new MyPromise(() => {
        throw boom;
      }),
    );
    await flush();
    expect(first).toMatchObject({ status: 'fulfilled', value: 1 });
    expect(thrown).toMatchObject({ status: 'rejected', reason: boom });
  });

  it('chains values, thrown errors and pass-through for missing handlers', async () => {
    const { MyPromise } = impl;
    const boom = new Error('boom');
    const result = track(
      MyPromise.resolve(1)
        .then((n) => n + 1)
        .then(null) // value passes through
        .then((n) => {
          throw Object.assign(boom, { n });
        })
        .then(() => 'skipped')
        .then(undefined, (e: Error & { n: number }) => e.n * 10)
        .catch(() => -1),
    );
    await flush();
    expect(result).toMatchObject({ status: 'fulfilled', value: 20 });

    const passedReason = track(MyPromise.reject(boom).then((x) => x));
    await flush();
    expect(passedReason).toMatchObject({ status: 'rejected', reason: boom });
  });

  it('adopts MyPromises, native promises and thenables, including later settles', async () => {
    const { MyPromise } = impl;
    const boom = new Error('later');
    let settleLater!: (v: string) => void;
    const later = new MyPromise<string>((resolve) => {
      settleLater = resolve;
    });

    const fromMy = track(MyPromise.resolve(0).then(() => later));
    const fromNative = track(new MyPromise((resolve) => resolve(Promise.resolve('native'))));
    const fromThenable = track(
      MyPromise.resolve(0).then(
        () =>
          ({
            then(onFulfilled: (v: string) => void) {
              setTimeout(() => onFulfilled('thenable'), 0);
            },
          }) as unknown as PromiseLike<string>,
      ),
    );
    const adoptedRejection = track(new MyPromise((resolve) => resolve(MyPromise.reject(boom))));

    await flush();
    await flush();
    expect(fromMy.status).toBe('pending');
    settleLater('mine');
    await flush();
    expect(fromMy).toMatchObject({ status: 'fulfilled', value: 'mine' });
    expect(fromNative).toMatchObject({ status: 'fulfilled', value: 'native' });
    expect(fromThenable).toMatchObject({ status: 'fulfilled', value: 'thenable' });
    expect(adoptedRejection).toMatchObject({ status: 'rejected', reason: boom });
  });

  it('only honours the first callback of a misbehaving thenable, and rejects if reading then throws', async () => {
    const { MyPromise } = impl;
    const messy = track(
      MyPromise.resolve(0).then(
        () =>
          ({
            then(onFulfilled: (v: string) => void, onRejected: (e: unknown) => void) {
              onFulfilled('first');
              onFulfilled('second');
              onRejected(new Error('nope'));
              throw new Error('nope either');
            },
          }) as unknown as PromiseLike<string>,
      ),
    );
    const getterError = new Error('getter');
    const badGetter = track(
      MyPromise.resolve(0).then(() => ({
        get then() {
          throw getterError;
        },
      })),
    );
    await flush();
    expect(messy).toMatchObject({ status: 'fulfilled', value: 'first' });
    expect(badGetter).toMatchObject({ status: 'rejected', reason: getterError });
  });

  it('rejects with a TypeError when a promise is resolved with itself', async () => {
    const { MyPromise } = impl;
    const self: PromiseLike<unknown> = MyPromise.resolve(1).then(() => self);
    const s = track(self);
    await flush();
    expect(s.status).toBe('rejected');
    expect(s.reason).toBeInstanceOf(TypeError);
  });

  it('runs handlers added after settlement, and every then on the same promise in order', async () => {
    const { MyPromise } = impl;
    const p = MyPromise.resolve('done');
    await flush();
    const log: string[] = [];
    p.then((v) => log.push(`a:${v}`));
    p.then((v) => log.push(`b:${v}`));
    p.then((v) => log.push(`c:${v}`));
    expect(log).toEqual([]);
    await flush();
    expect(log).toEqual(['a:done', 'b:done', 'c:done']);

    let resolveLater!: (v: number) => void;
    const pending = new MyPromise<number>((resolve) => {
      resolveLater = resolve;
    });
    const seen: number[] = [];
    pending.then((v) => seen.push(v));
    pending.then((v) => seen.push(v * 2));
    resolveLater(5);
    await flush();
    expect(seen).toEqual([5, 10]);
  });

  it('finally passes the original outcome through unless it throws or rejects', async () => {
    const { MyPromise } = impl;
    const boom = new Error('boom');
    const finallyError = new Error('from finally');
    const calls: unknown[][] = [];

    const kept = track(
      MyPromise.resolve('value').finally((...args: unknown[]) => {
        calls.push(args);
        return 'ignored';
      }),
    );
    const keptReason = track(MyPromise.reject(boom).finally(() => undefined));
    const overridden = track(
      MyPromise.resolve('value').finally(() => {
        throw finallyError;
      }),
    );
    const overriddenByRejection = track(MyPromise.resolve('value').finally(() => MyPromise.reject(finallyError)));

    await flush();
    expect(calls).toEqual([[]]);
    expect(kept).toMatchObject({ status: 'fulfilled', value: 'value' });
    expect(keptReason).toMatchObject({ status: 'rejected', reason: boom });
    expect(overridden).toMatchObject({ status: 'rejected', reason: finallyError });
    expect(overriddenByRejection).toMatchObject({ status: 'rejected', reason: finallyError });
  });

  it('finally waits for a promise returned by onFinally', async () => {
    const { MyPromise } = impl;
    let release!: () => void;
    const gate = new MyPromise<void>((resolve) => {
      release = () => resolve();
    });
    const s = track(MyPromise.resolve('value').finally(() => gate));
    await flush();
    expect(s.status).toBe('pending');
    release();
    await flush();
    expect(s).toMatchObject({ status: 'fulfilled', value: 'value' });
  });

  it('statics and then/catch/finally return MyPromise instances; resolve returns an existing MyPromise as-is', async () => {
    const { MyPromise } = impl;
    const p = MyPromise.resolve(1);
    expect(p).toBeInstanceOf(MyPromise);
    expect(MyPromise.resolve(p)).toBe(p);
    const rejected = MyPromise.reject(new Error('x'));
    expect(rejected).toBeInstanceOf(MyPromise);
    const derived = p.then((n) => n);
    expect(derived).toBeInstanceOf(MyPromise);
    expect(derived).not.toBe(p);
    expect(rejected.catch(() => 0)).toBeInstanceOf(MyPromise);
    expect(p.finally(() => {})).toBeInstanceOf(MyPromise);

    const rejectWithPromise = track(MyPromise.reject(p));
    await flush();
    expect(rejectWithPromise).toMatchObject({ status: 'rejected', reason: p });
  });

  it('works with await', async () => {
    const { MyPromise } = impl;
    const value = await new MyPromise<string>((resolve) => setTimeout(() => resolve('awaited'), 0));
    expect(value).toBe('awaited');
    const boom = new Error('boom');
    await expect(
      (async () => {
        await MyPromise.reject(boom);
      })(),
    ).rejects.toBe(boom);
  });
});

describeFollowUp(1, 'MyPromise.all / MyPromise.any', () => {
  it('all fulfils in input order and rejects with the first rejection', async () => {
    const { MyPromise } = impl;
    let resolveSlow!: (v: string) => void;
    const slow = new MyPromise<string>((resolve) => {
      resolveSlow = resolve;
    });
    const all = MyPromise.all<string | number>([slow, MyPromise.resolve('fast'), 3]);
    expect(all).toBeInstanceOf(MyPromise);
    const s = track(all);
    await flush();
    expect(s.status).toBe('pending');
    resolveSlow('slow');
    await flush();
    expect(s).toMatchObject({ status: 'fulfilled', value: ['slow', 'fast', 3] });

    const boom = new Error('boom');
    const failed = track(MyPromise.all([new MyPromise(() => {}), MyPromise.reject(boom)]));
    const empty = track(MyPromise.all([]));
    await flush();
    expect(failed).toMatchObject({ status: 'rejected', reason: boom });
    expect(empty).toMatchObject({ status: 'fulfilled', value: [] });
  });

  it('any fulfils with the first fulfilment, or rejects with an AggregateError in input order', async () => {
    const { MyPromise } = impl;
    const e1 = new Error('1');
    const e2 = new Error('2');
    const first = track(MyPromise.any([MyPromise.reject(e1), MyPromise.resolve('winner')]));

    let rejectFirst!: (e: unknown) => void;
    const lateRejection = new MyPromise((_, reject) => {
      rejectFirst = reject;
    });
    const none = track(MyPromise.any([lateRejection, MyPromise.reject(e2)]));
    const empty = track(MyPromise.any([]));
    await flush();
    rejectFirst(e1);
    await flush();
    expect(first).toMatchObject({ status: 'fulfilled', value: 'winner' });
    expect(none.status).toBe('rejected');
    expect(none.reason).toBeInstanceOf(AggregateError);
    expect((none.reason as AggregateError).errors).toEqual([e1, e2]);
    expect(empty.status).toBe('rejected');
    expect(empty.reason).toBeInstanceOf(AggregateError);
  });
});
