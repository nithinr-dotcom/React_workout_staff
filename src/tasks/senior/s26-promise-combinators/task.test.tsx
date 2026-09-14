import { expect, it, vi } from 'vitest';
import { pickTarget } from '../../../test/target';
import * as Reference from './Reference';
import * as Solution from './Solution';
import type { NodeCallback } from './types';

const { impl, describeTask, describeFollowUp } = pickTarget(Solution, Reference);

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** Lets every pending microtask (and promise chain) run. */
const flush = () => new Promise((r) => setTimeout(r, 0));

/** Observes a promise's state without awaiting it. */
function track<T>(promise: Promise<T>) {
  const s: { status: 'pending' | 'fulfilled' | 'rejected'; value: unknown } = { status: 'pending', value: undefined };
  promise.then(
    (value) => {
      s.status = 'fulfilled';
      s.value = value;
    },
    (reason: unknown) => {
      s.status = 'rejected';
      s.value = reason;
    },
  );
  return s;
}

describeTask('Promise combinators', () => {
  it('promiseAll fulfils with values in input order even when inputs settle in reverse', async () => {
    const a = deferred<string>();
    const b = deferred<string>();
    const c = deferred<string>();
    const result = impl.promiseAll([a.promise, b.promise, c.promise]);
    expect(result).toBeInstanceOf(Promise);
    c.resolve('c');
    await flush();
    b.resolve('b');
    await flush();
    a.resolve('a');
    await expect(result).resolves.toEqual(['a', 'b', 'c']);
  });

  it('promiseAll accepts plain values, thenables and any iterable', async () => {
    const thenable = { then: (onFulfilled: (v: number) => void) => onFulfilled(2) } as unknown as PromiseLike<number>;
    await expect(impl.promiseAll([1, thenable, Promise.resolve(3)])).resolves.toEqual([1, 2, 3]);
    await expect(impl.promiseAll(new Set(['x', 'y']))).resolves.toEqual(['x', 'y']);
    function* gen() {
      yield Promise.resolve('g1');
      yield 'g2';
    }
    await expect(impl.promiseAll(gen())).resolves.toEqual(['g1', 'g2']);
  });

  it('promiseAll is asynchronous even for empty or synchronous input', async () => {
    const empty = track(impl.promiseAll([]));
    const plain = track(impl.promiseAll([1, 2]));
    expect(empty.status).toBe('pending');
    expect(plain.status).toBe('pending');
    await flush();
    expect(empty).toEqual({ status: 'fulfilled', value: [] });
    expect(plain).toEqual({ status: 'fulfilled', value: [1, 2] });
  });

  it('promiseAll rejects with the first rejection without waiting for pending inputs', async () => {
    const slow = deferred<number>();
    const failing = deferred<number>();
    const later = deferred<number>();
    const result = track(impl.promiseAll([slow.promise, failing.promise, later.promise]));
    const boom = new Error('first');
    failing.reject(boom);
    await flush();
    expect(result).toEqual({ status: 'rejected', value: boom });
    // Settling the others afterwards changes nothing.
    later.reject(new Error('second'));
    slow.resolve(1);
    await flush();
    expect(result.value).toBe(boom);
  });

  it('promiseAllSettled reports every outcome in input order and never rejects', async () => {
    const a = deferred<number>();
    const b = deferred<number>();
    const err = new Error('nope');
    const result = impl.promiseAllSettled<number | string>([a.promise, b.promise, 'plain']);
    b.reject(err);
    await flush();
    a.resolve(1);
    await expect(result).resolves.toEqual([
      { status: 'fulfilled', value: 1 },
      { status: 'rejected', reason: err },
      { status: 'fulfilled', value: 'plain' },
    ]);
  });

  it('promiseAllSettled fulfils with [] for an empty iterable', async () => {
    await expect(impl.promiseAllSettled([])).resolves.toEqual([]);
  });

  it('promiseAny fulfils with the first fulfilment, ignoring earlier rejections', async () => {
    const a = deferred<string>();
    const b = deferred<string>();
    const c = deferred<string>();
    const result = track(impl.promiseAny([a.promise, b.promise, c.promise]));
    a.reject(new Error('a failed'));
    await flush();
    expect(result.status).toBe('pending');
    c.resolve('c');
    await flush();
    b.resolve('b');
    await flush();
    expect(result).toEqual({ status: 'fulfilled', value: 'c' });
  });

  it('promiseAny rejects with an AggregateError whose errors follow input order', async () => {
    const a = deferred<never>();
    const b = deferred<never>();
    const result = impl.promiseAny([a.promise, b.promise]);
    const handled = result.catch((e: unknown) => e);
    b.reject('b-reason');
    await flush();
    a.reject('a-reason');
    const error = await handled;
    expect(error).toBeInstanceOf(AggregateError);
    expect((error as AggregateError).errors).toEqual(['a-reason', 'b-reason']);
  });

  it('promiseAny rejects with an empty AggregateError for an empty iterable', async () => {
    const error = await impl.promiseAny([]).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AggregateError);
    expect((error as AggregateError).errors).toEqual([]);
  });

  it('promiseRace settles like the first input to settle (fulfilment or rejection)', async () => {
    const a = deferred<string>();
    const b = deferred<string>();
    const won = track(impl.promiseRace([a.promise, b.promise]));
    b.resolve('b');
    await flush();
    a.resolve('a');
    await flush();
    expect(won).toEqual({ status: 'fulfilled', value: 'b' });

    const c = deferred<string>();
    const d = deferred<string>();
    const lost = track(impl.promiseRace([c.promise, d.promise]));
    const err = new Error('d failed');
    d.reject(err);
    await flush();
    c.resolve('c');
    await flush();
    expect(lost).toEqual({ status: 'rejected', value: err });
  });

  it('promiseRace with an empty iterable stays pending forever', async () => {
    const result = track(impl.promiseRace([]));
    await flush();
    await flush();
    expect(result.status).toBe('pending');
  });

  it('never throws synchronously when iterating the input throws', async () => {
    const bad = {
      [Symbol.iterator]() {
        throw new Error('iterator broke');
      },
    } as Iterable<number>;
    const calls = [impl.promiseAll, impl.promiseAllSettled, impl.promiseAny, impl.promiseRace];
    for (const call of calls) {
      let returned: Promise<unknown> | undefined;
      expect(() => {
        returned = call(bad);
      }).not.toThrow();
      await expect(returned).rejects.toThrow('iterator broke');
    }
  });

  it('does not delegate to the native combinators', async () => {
    const spies = [
      vi.spyOn(Promise, 'all'),
      vi.spyOn(Promise, 'allSettled'),
      vi.spyOn(Promise, 'any'),
      vi.spyOn(Promise, 'race'),
    ];
    try {
      const results = [
        impl.promiseAll([1, Promise.resolve(2)]),
        impl.promiseAllSettled([1, Promise.reject(new Error('x'))]),
        impl.promiseAny([Promise.reject(new Error('y')), 2]),
        impl.promiseRace([Promise.resolve(1)]),
      ];
      for (const r of results) await r;
      for (const spy of spies) expect(spy).not.toHaveBeenCalled();
    } finally {
      for (const spy of spies) spy.mockRestore();
    }
  });
});

describeFollowUp(1, 'promiseProps', () => {
  it('resolves an object of promises into an object of values', async () => {
    await expect(
      impl.promiseProps({ user: Promise.resolve({ name: 'Ada' }), count: 3, posts: Promise.resolve(['p1']) }),
    ).resolves.toEqual({ user: { name: 'Ada' }, count: 3, posts: ['p1'] });
  });

  it('rejects like promiseAll', async () => {
    const err = new Error('posts failed');
    await expect(impl.promiseProps({ user: Promise.resolve(1), posts: Promise.reject(err) })).rejects.toBe(err);
  });
});

describeFollowUp(2, 'promisify', () => {
  function readFile(this: { root: string }, path: string, cb: NodeCallback<string>) {
    setTimeout(() => {
      if (path === 'missing') cb(new Error('ENOENT'));
      else cb(null, `${this.root}/${path}`);
    }, 0);
  }

  it('fulfils with the callback result and forwards this and arguments', async () => {
    const fs = { root: '/home', read: impl.promisify(readFile) };
    await expect(fs.read('notes.txt')).resolves.toBe('/home/notes.txt');
  });

  it('rejects when the callback receives an error', async () => {
    const fs = { root: '/home', read: impl.promisify(readFile) };
    await expect(fs.read('missing')).rejects.toThrow('ENOENT');
  });
});
