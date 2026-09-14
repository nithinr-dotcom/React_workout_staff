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

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** batchFn that answers `key * 10` for every key. */
const timesTen = () => vi.fn((keys: number[]) => Promise.resolve(keys.map((k) => k * 10)));

describeTask('createBatcher', () => {
  it('sends keys loaded within the window as one batch when the window ends', async () => {
    const batchFn = timesTen();
    const batcher = impl.createBatcher(batchFn, { maxWaitMs: 50 });
    const a = track(batcher.load(1));
    await vi.advanceTimersByTimeAsync(30);
    const b = track(batcher.load(2)); // does not restart the window
    await vi.advanceTimersByTimeAsync(19);
    expect(batchFn).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1); // t = 50
    expect(batchFn).toHaveBeenCalledTimes(1);
    expect(batchFn).toHaveBeenCalledWith([1, 2]);
    await vi.advanceTimersByTimeAsync(0);
    expect(a).toMatchObject({ status: 'fulfilled', value: 10 });
    expect(b).toMatchObject({ status: 'fulfilled', value: 20 });
  });

  it('maps results back by index, even when batches resolve out of order', async () => {
    const pending: { keys: string[]; d: ReturnType<typeof deferred<string[]>> }[] = [];
    const batchFn = vi.fn((keys: string[]) => {
      const d = deferred<string[]>();
      pending.push({ keys, d });
      return d.promise;
    });
    const batcher = impl.createBatcher(batchFn, { maxWaitMs: 10 });
    const first = [track(batcher.load('c')), track(batcher.load('a'))];
    await vi.advanceTimersByTimeAsync(10);
    const second = track(batcher.load('b'));
    await vi.advanceTimersByTimeAsync(10);
    expect(pending.map((p) => p.keys)).toEqual([['c', 'a'], ['b']]);

    pending[1].d.resolve(['B']);
    await vi.advanceTimersByTimeAsync(0);
    expect(second).toMatchObject({ status: 'fulfilled', value: 'B' });
    expect(first[0].status).toBe('pending');

    pending[0].d.resolve(['C', 'A']);
    await vi.advanceTimersByTimeAsync(0);
    expect(first.map((s) => s.value)).toEqual(['C', 'A']);
  });

  it('defaults to batching everything loaded in the same synchronous run', async () => {
    const batchFn = timesTen();
    const batcher = impl.createBatcher(batchFn);
    const results = Promise.all([batcher.load(1), batcher.load(2), batcher.load(3)]);
    expect(batchFn).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(0);
    expect(batchFn).toHaveBeenCalledTimes(1);
    expect(batchFn).toHaveBeenCalledWith([1, 2, 3]);
    await expect(results).resolves.toEqual([10, 20, 30]);
  });

  it('sends each key once per batch and gives every duplicate caller the result', async () => {
    const batchFn = timesTen();
    const batcher = impl.createBatcher(batchFn, { maxWaitMs: 20 });
    const calls = [batcher.load(5), batcher.load(6), batcher.load(5), batcher.load(5)];
    await vi.advanceTimersByTimeAsync(20);
    expect(batchFn).toHaveBeenCalledTimes(1);
    expect(batchFn).toHaveBeenCalledWith([5, 6]);
    await expect(Promise.all(calls)).resolves.toEqual([50, 60, 50, 50]);
  });

  it('flushes immediately when maxBatchSize is reached, and the next key gets a fresh window', async () => {
    const batchFn = timesTen();
    const batcher = impl.createBatcher(batchFn, { maxBatchSize: 3, maxWaitMs: 50 });
    const first = Promise.all([batcher.load(1), batcher.load(2), batcher.load(2), batcher.load(3)]);
    const fourth = track(batcher.load(4));
    await vi.advanceTimersByTimeAsync(0);
    expect(batchFn).toHaveBeenCalledTimes(1);
    expect(batchFn).toHaveBeenLastCalledWith([1, 2, 3]);
    await expect(first).resolves.toEqual([10, 20, 20, 30]);

    await vi.advanceTimersByTimeAsync(49); // t = 49
    expect(batchFn).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1); // t = 50: window of key 4 ends
    expect(batchFn).toHaveBeenCalledTimes(2);
    expect(batchFn).toHaveBeenLastCalledWith([4]);
    await vi.advanceTimersByTimeAsync(0);
    expect(fourth).toMatchObject({ status: 'fulfilled', value: 40 });
  });

  it('a size flush cancels the old window, so it cannot flush the next batch early', async () => {
    const batchFn = timesTen();
    const batcher = impl.createBatcher(batchFn, { maxBatchSize: 2, maxWaitMs: 100 });
    batcher.load(1);
    await vi.advanceTimersByTimeAsync(60);
    batcher.load(2); // size reached at t = 60
    await vi.advanceTimersByTimeAsync(0);
    expect(batchFn).toHaveBeenCalledTimes(1);
    batcher.load(3); // new window: should end at t = 160, not t = 100
    await vi.advanceTimersByTimeAsync(50); // t = 110
    expect(batchFn).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(50); // t = 160
    expect(batchFn).toHaveBeenCalledTimes(2);
    expect(batchFn).toHaveBeenLastCalledWith([3]);
  });

  it('rejects only the key whose result is an Error, or whose result is missing', async () => {
    const notFound = new Error('user 2 not found');
    const batchFn = vi.fn(async (keys: number[]) => {
      void keys;
      return ['one', notFound, 'three'] as (string | Error)[];
    });
    const batcher = impl.createBatcher(batchFn, { maxWaitMs: 5 });
    const results = [1, 2, 3, 4].map((k) => track(batcher.load(k)));
    await vi.advanceTimersByTimeAsync(5);
    await vi.advanceTimersByTimeAsync(0);
    expect(results[0]).toMatchObject({ status: 'fulfilled', value: 'one' });
    expect(results[1]).toMatchObject({ status: 'rejected', error: notFound });
    expect(results[2]).toMatchObject({ status: 'fulfilled', value: 'three' });
    expect(results[3].status).toBe('rejected');
    expect(results[3].error).toBeInstanceOf(Error);
  });

  it('rejects every key in the batch when batchFn rejects or throws, and keeps working afterwards', async () => {
    const down = new Error('service down');
    const thrown = new Error('bad input');
    const batchFn = vi
      .fn((keys: number[]) => Promise.resolve(keys.map((k) => k * 10)))
      .mockImplementationOnce(() => Promise.reject(down))
      .mockImplementationOnce(() => {
        throw thrown;
      });
    const batcher = impl.createBatcher(batchFn, { maxWaitMs: 5 });

    const rejected = [track(batcher.load(1)), track(batcher.load(2))];
    await vi.advanceTimersByTimeAsync(5);
    await vi.advanceTimersByTimeAsync(0);
    expect(rejected.map((s) => s.error)).toEqual([down, down]);

    const thrownBatch = [track(batcher.load(3)), track(batcher.load(4))];
    await vi.advanceTimersByTimeAsync(5);
    await vi.advanceTimersByTimeAsync(0);
    expect(thrownBatch.map((s) => s.error)).toEqual([thrown, thrown]);

    const ok = track(batcher.load(5));
    await vi.advanceTimersByTimeAsync(5);
    await vi.advanceTimersByTimeAsync(0);
    expect(ok).toMatchObject({ status: 'fulfilled', value: 50 });
    expect(batchFn).toHaveBeenCalledTimes(3);
  });

  it('sends a key again in a later window (no cache by default) and keeps batchers independent', async () => {
    const batchFn = timesTen();
    const other = timesTen();
    const batcher = impl.createBatcher(batchFn, { maxWaitMs: 5 });
    const second = impl.createBatcher(other, { maxWaitMs: 5 });
    batcher.load(1);
    second.load(9);
    await vi.advanceTimersByTimeAsync(5);
    batcher.load(1);
    await vi.advanceTimersByTimeAsync(5);
    expect(batchFn.mock.calls).toEqual([[[1]], [[1]]]);
    expect(other.mock.calls).toEqual([[[9]]]);
  });
});

describeFollowUp(1, 'loadMany', () => {
  it('returns values and Errors in order, batched together with load', async () => {
    const missing = new Error('missing');
    const batchFn = vi.fn((keys: number[]) => Promise.resolve(keys.map((k) => (k === 2 ? missing : k * 10))));
    const batcher = impl.createBatcher(batchFn, { maxWaitMs: 10 });
    const many = batcher.loadMany([1, 2, 3]);
    const single = batcher.load(4);
    await vi.advanceTimersByTimeAsync(10);
    expect(batchFn).toHaveBeenCalledTimes(1);
    expect(batchFn).toHaveBeenCalledWith([1, 2, 3, 4]);
    await expect(many).resolves.toEqual([10, missing, 30]);
    await expect(single).resolves.toBe(40);
  });
});

describeFollowUp(3, 'cache, prime and clear', () => {
  it('caches successful keys across batches, not failed ones, and honours prime/clear/clearAll', async () => {
    const failOnce = new Set([2]);
    const batchFn = vi.fn((keys: number[]) =>
      Promise.resolve(
        keys.map((k) => {
          if (failOnce.has(k)) {
            failOnce.delete(k);
            return new Error(`fail ${k}`);
          }
          return k * 10;
        }),
      ),
    );
    const batcher = impl.createBatcher(batchFn, { maxWaitMs: 5, cache: true });
    batcher.prime(7, 777);

    const round1 = [track(batcher.load(1)), track(batcher.load(2)), track(batcher.load(7))];
    await vi.advanceTimersByTimeAsync(5);
    await vi.advanceTimersByTimeAsync(0);
    expect(batchFn).toHaveBeenLastCalledWith([1, 2]);
    expect(round1.map((s) => s.status)).toEqual(['fulfilled', 'rejected', 'fulfilled']);
    expect(round1[2].value).toBe(777);

    const round2 = [track(batcher.load(1)), track(batcher.load(2))];
    await vi.advanceTimersByTimeAsync(5);
    await vi.advanceTimersByTimeAsync(0);
    expect(batchFn).toHaveBeenLastCalledWith([2]); // 1 was cached, 2 had failed
    expect(round2.map((s) => s.value)).toEqual([10, 20]);

    batcher.clear(1);
    batcher.load(1);
    batcher.load(2);
    await vi.advanceTimersByTimeAsync(5);
    expect(batchFn).toHaveBeenLastCalledWith([1]);

    batcher.clearAll();
    batcher.load(1);
    batcher.load(2);
    batcher.load(7);
    await vi.advanceTimersByTimeAsync(5);
    expect(batchFn).toHaveBeenLastCalledWith([1, 2, 7]);
    expect(batchFn).toHaveBeenCalledTimes(4);
  });
});
