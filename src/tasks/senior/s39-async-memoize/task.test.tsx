// ⚠ Unverified: written before the reference solution. If a test looks wrong, trust the README.
import { expect, it, vi } from 'vitest';
import { pickTarget } from '../../../test/target';
import * as Reference from './Reference';
import * as Solution from './Solution';

const { impl, describeTask, describeFollowUp } = pickTarget(Solution, Reference);

const tick = () => new Promise((r) => setTimeout(r, 0));

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** A fake request function: every call returns a fresh deferred you control. */
function controlledFn<Args extends unknown[], R>() {
  const pending: ReturnType<typeof deferred<R>>[] = [];
  const fn = vi.fn((...args: Args) => {
    void args;
    const d = deferred<R>();
    pending.push(d);
    return d.promise;
  });
  return { fn, pending };
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

describeTask('memoizeAsync', () => {
  it('calls fn once per key, forwards all arguments and serves later calls from the cache', async () => {
    const { fn, pending } = controlledFn<[number, string], string>();
    const memo = impl.memoizeAsync(fn);

    const first = memo(1, 'a');
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith(1, 'a');
    pending[0].resolve('one-a');
    await expect(first).resolves.toBe('one-a');

    await expect(memo(1, 'a')).resolves.toBe('one-a');
    expect(fn).toHaveBeenCalledTimes(1);

    const other = memo(1, 'b');
    expect(fn).toHaveBeenCalledTimes(2);
    pending[1].resolve('one-b');
    await expect(other).resolves.toBe('one-b');
  });

  it('shares one in-flight call between concurrent identical calls', async () => {
    const { fn, pending } = controlledFn<[string], string>();
    const memo = impl.memoizeAsync(fn);
    const calls = [memo('x'), memo('x'), memo('x')];
    await tick();
    expect(fn).toHaveBeenCalledTimes(1);
    pending[0].resolve('shared');
    await expect(Promise.all(calls)).resolves.toEqual(['shared', 'shared', 'shared']);
  });

  it('treats objects with the same keys in a different order as the same key, at any depth', async () => {
    const { fn, pending } = controlledFn<[unknown], string>();
    const memo = impl.memoizeAsync(fn);
    const a = memo({ id: 7, filter: { status: 'open', owner: 'ada' }, fields: ['name', 'email'] });
    const b = memo({ fields: ['name', 'email'], filter: { owner: 'ada', status: 'open' }, id: 7 });
    expect(fn).toHaveBeenCalledTimes(1);
    pending[0].resolve('user');
    await expect(Promise.all([a, b])).resolves.toEqual(['user', 'user']);

    memo({ id: 7, filter: { status: 'open', owner: 'ada' }, fields: ['email', 'name'] }); // array order matters
    memo('1');
    memo(1); // different type, different key
    expect(fn).toHaveBeenCalledTimes(4);
    pending.slice(1).forEach((d) => d.resolve('other'));
  });

  it('does not cache rejections: all waiting callers reject, the next call retries', async () => {
    const { fn, pending } = controlledFn<[string], string>();
    const memo = impl.memoizeAsync(fn);
    const boom = new Error('boom');
    const a = track(memo('k'));
    const b = track(memo('k'));
    pending[0].reject(boom);
    await tick();
    expect(a).toMatchObject({ status: 'rejected', error: boom });
    expect(b).toMatchObject({ status: 'rejected', error: boom });

    const retry = memo('k');
    expect(fn).toHaveBeenCalledTimes(2);
    pending[1].resolve('ok');
    await expect(retry).resolves.toBe('ok');
  });

  it('returns a rejected promise instead of throwing when fn throws synchronously', async () => {
    const boom = new Error('sync');
    const fn = vi
      .fn<(id: number) => Promise<string>>()
      .mockImplementationOnce(() => {
        throw boom;
      })
      .mockResolvedValueOnce('recovered');
    const memo = impl.memoizeAsync(fn);
    let result: Promise<string> | undefined;
    expect(() => {
      result = memo(1);
    }).not.toThrow();
    await expect(result).rejects.toBe(boom);
    await expect(memo(1)).resolves.toBe('recovered');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('expires values ttl ms after they fulfilled, using the injected clock', async () => {
    let clock = 0;
    const { fn, pending } = controlledFn<[string], number>();
    const memo = impl.memoizeAsync(fn, { ttl: 1000, now: () => clock });

    const first = memo('k');
    clock = 500; // slow request fulfils at t=500
    pending[0].resolve(1);
    await first;

    clock = 1499;
    await expect(memo('k')).resolves.toBe(1);
    expect(fn).toHaveBeenCalledTimes(1);

    clock = 1500;
    const refreshed = memo('k');
    expect(fn).toHaveBeenCalledTimes(2);
    pending[1].resolve(2);
    await expect(refreshed).resolves.toBe(2);
  });

  it('never expires an in-flight call', async () => {
    let clock = 0;
    const { fn, pending } = controlledFn<[string], string>();
    const memo = impl.memoizeAsync(fn, { ttl: 100, now: () => clock });
    const early = memo('k');
    clock = 5000;
    const late = memo('k');
    expect(fn).toHaveBeenCalledTimes(1);
    pending[0].resolve('v');
    await expect(Promise.all([early, late])).resolves.toEqual(['v', 'v']);
  });

  it('uses a custom key function', async () => {
    const fn = vi.fn((id: number, opts: { verbose: boolean }) => Promise.resolve(`${id}:${opts.verbose}`));
    const memo = impl.memoizeAsync(fn, { key: (id) => String(id) });
    await expect(memo(1, { verbose: true })).resolves.toBe('1:true');
    await expect(memo(1, { verbose: false })).resolves.toBe('1:true');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('delete(...args) removes one entry using the same key logic', async () => {
    const fn = vi.fn((q: { a: number; b: number }) => Promise.resolve(q.a + q.b));
    const memo = impl.memoizeAsync(fn);
    await memo({ a: 1, b: 2 });
    await memo({ a: 5, b: 5 });
    expect(memo.delete({ b: 2, a: 1 })).toBe(true);
    expect(memo.delete({ b: 2, a: 1 })).toBe(false);
    await memo({ a: 1, b: 2 });
    await memo({ a: 5, b: 5 });
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('clear() during flight: waiting callers still settle, but the stale result never repopulates the cache', async () => {
    const { fn, pending } = controlledFn<[string], string>();
    const memo = impl.memoizeAsync(fn);

    const stale = memo('k');
    memo.clear();
    const fresh = memo('k');
    expect(fn).toHaveBeenCalledTimes(2);

    pending[0].resolve('old');
    await expect(stale).resolves.toBe('old');

    // The newer in-flight request is still the entry for 'k'.
    const joined = memo('k');
    expect(fn).toHaveBeenCalledTimes(2);
    pending[1].resolve('new');
    await expect(Promise.all([fresh, joined])).resolves.toEqual(['new', 'new']);
    await expect(memo('k')).resolves.toBe('new');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('a stale rejection after delete does not remove the newer entry', async () => {
    const { fn, pending } = controlledFn<[string], string>();
    const memo = impl.memoizeAsync(fn);
    const stale = track(memo('k'));
    memo.delete('k');
    const fresh = memo('k');
    pending[1].resolve('new');
    await fresh;
    pending[0].reject(new Error('old failure'));
    await tick();
    expect(stale.status).toBe('rejected');
    await expect(memo('k')).resolves.toBe('new');
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

describeFollowUp(1, 'memoizeCallback', () => {
  it('dedupes concurrent callback-style calls and does not cache errors', async () => {
    const pending: ((err: unknown, result?: string) => void)[] = [];
    const fn = vi.fn((id: number, cb: (err: unknown, result?: string) => void) => {
      void id;
      pending.push(cb);
    });
    const memo = impl.memoizeCallback<[number], string>(fn);

    const results: unknown[][] = [];
    memo(1, (err, res) => results.push([err, res]));
    memo(1, (err, res) => results.push([err, res]));
    await tick();
    expect(fn).toHaveBeenCalledTimes(1);
    const boom = new Error('boom');
    pending[0](boom);
    await tick();
    expect(results).toEqual([
      [boom, undefined],
      [boom, undefined],
    ]);

    memo(1, (err, res) => results.push([err, res]));
    await tick();
    expect(fn).toHaveBeenCalledTimes(2);
    pending[1](null, 'ok');
    await tick();
    expect(results[2]).toEqual([null, 'ok']);

    let sync = true;
    let calledSync = false;
    memo(1, () => {
      calledSync = sync;
    });
    sync = false;
    await tick();
    expect(fn).toHaveBeenCalledTimes(2);
    expect(calledSync).toBe(false);
  });
});

describeFollowUp(2, 'maxSize', () => {
  it('evicts the least recently used entry, where a cache hit counts as a use', async () => {
    const fn = vi.fn((k: string) => Promise.resolve(k.toUpperCase()));
    const memo = impl.memoizeAsync(fn, { maxSize: 2 });
    await memo('a');
    await memo('b');
    await memo('a'); // hit: 'a' is now most recent
    await memo('c'); // evicts 'b'
    expect(fn).toHaveBeenCalledTimes(3);
    await memo('a');
    expect(fn).toHaveBeenCalledTimes(3);
    await memo('b');
    expect(fn).toHaveBeenCalledTimes(4);
  });
});
