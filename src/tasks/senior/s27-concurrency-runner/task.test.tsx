import { expect, it, vi } from 'vitest';
import { pickTarget } from '../../../test/target';
import * as Reference from './Reference';
import * as Solution from './Solution';

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

const flush = () => new Promise((r) => setTimeout(r, 0));

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

/** A controllable task factory: records starts and lets the test finish each task by name. */
function controller() {
  const started: string[] = [];
  const handles = new Map<string, ReturnType<typeof deferred<string>>>();
  const task = (name: string) => () => {
    started.push(name);
    const d = deferred<string>();
    handles.set(name, d);
    return d.promise;
  };
  const finish = (name: string, value = name) => handles.get(name)!.resolve(value);
  const fail = (name: string, error: unknown) => handles.get(name)!.reject(error);
  return { started, task, finish, fail };
}

describeTask('mapAsyncLimit', () => {
  it('never exceeds the limit and starts the next item as soon as a slot frees up', async () => {
    const c = controller();
    const result = impl.mapAsyncLimit(['a', 'b', 'c', 'd', 'e'], 2, (item) => c.task(item)());
    await flush();
    expect(c.started).toEqual(['a', 'b']);
    c.finish('b');
    await flush();
    // Not chunked: 'c' starts while 'a' is still running.
    expect(c.started).toEqual(['a', 'b', 'c']);
    c.finish('c');
    await flush();
    expect(c.started).toEqual(['a', 'b', 'c', 'd']);
    c.finish('a');
    c.finish('d');
    await flush();
    c.finish('e');
    await expect(result).resolves.toEqual(['a', 'b', 'c', 'd', 'e']);
  });

  it('resolves results in input order and passes the index', async () => {
    const delays = [30, 10, 20];
    const fn = vi.fn((ms: number, index: number) => new Promise<string>((r) => setTimeout(() => r(`${index}:${ms}`), ms)));
    await expect(impl.mapAsyncLimit(delays, 3, fn)).resolves.toEqual(['0:30', '1:10', '2:20']);
    expect(fn.mock.calls.map((call) => call[1])).toEqual([0, 1, 2]);
  });

  it('rejects with the first error and starts no further items', async () => {
    const c = controller();
    const result = track(impl.mapAsyncLimit(['a', 'b', 'c', 'd'], 2, (item) => c.task(item)()));
    await flush();
    const boom = new Error('b failed');
    c.fail('b', boom);
    await flush();
    expect(result).toEqual({ status: 'rejected', value: boom });
    c.fail('a', new Error('a failed later'));
    await flush();
    expect(c.started).toEqual(['a', 'b']);
    expect(result.value).toBe(boom);
  });

  it('handles empty input, plain return values and synchronous throws', async () => {
    const fn = vi.fn();
    await expect(impl.mapAsyncLimit([], 2, fn)).resolves.toEqual([]);
    expect(fn).not.toHaveBeenCalled();

    await expect(impl.mapAsyncLimit(new Set([1, 2, 3]), 2, (n) => n * 10)).resolves.toEqual([10, 20, 30]);

    const syncError = new Error('sync');
    await expect(
      impl.mapAsyncLimit([1, 2], 1, () => {
        throw syncError;
      }),
    ).rejects.toBe(syncError);
  });

  it('rejects with a RangeError for an invalid limit, and accepts Infinity', async () => {
    await expect(impl.mapAsyncLimit([1], 0, (n) => n)).rejects.toBeInstanceOf(RangeError);
    await expect(impl.mapAsyncLimit([1], 1.5, (n) => n)).rejects.toBeInstanceOf(RangeError);

    const c = controller();
    const result = impl.mapAsyncLimit(['a', 'b', 'c'], Infinity, (item) => c.task(item)());
    await flush();
    expect(c.started).toEqual(['a', 'b', 'c']);
    ['a', 'b', 'c'].forEach((n) => c.finish(n));
    await expect(result).resolves.toEqual(['a', 'b', 'c']);
  });
});

describeTask('createQueue', () => {
  it('throws a RangeError for an invalid concurrency', () => {
    expect(() => impl.createQueue({ concurrency: 0 })).toThrow(RangeError);
    expect(() => impl.createQueue({ concurrency: -1 })).toThrow(RangeError);
    expect(() => impl.createQueue({ concurrency: 2.5 })).toThrow(RangeError);
  });

  it('runs at most `concurrency` tasks in FIFO order and reports size and pending', async () => {
    const c = controller();
    const q = impl.createQueue({ concurrency: 2 });
    const results = ['a', 'b', 'c', 'd'].map((n) => q.add(c.task(n)));
    await flush();
    expect(c.started).toEqual(['a', 'b']);
    expect(q.pending).toBe(2);
    expect(q.size).toBe(2);
    c.finish('a');
    await flush();
    expect(c.started).toEqual(['a', 'b', 'c']);
    expect(q.pending).toBe(2);
    expect(q.size).toBe(1);
    c.finish('b');
    c.finish('c');
    await flush();
    c.finish('d');
    await expect(Promise.all(results)).resolves.toEqual(['a', 'b', 'c', 'd']);
    expect(q.pending).toBe(0);
    expect(q.size).toBe(0);
  });

  it('settles each add() with its own outcome; a failure does not stop the queue', async () => {
    const q = impl.createQueue({ concurrency: 1 });
    const err = new Error('task 1 failed');
    const first = q.add(() => Promise.reject(err));
    const second = q.add(() => 'plain value');
    const third = q.add(() => {
      throw new Error('sync throw');
    });
    const fourth = q.add(async () => 42);
    await expect(first).rejects.toBe(err);
    await expect(second).resolves.toBe('plain value');
    await expect(third).rejects.toThrow('sync throw');
    await expect(fourth).resolves.toBe(42);
    expect(q.pending).toBe(0);
  });

  it('pause() stops new tasks from starting and resume() fills the free slots', async () => {
    const c = controller();
    const q = impl.createQueue({ concurrency: 2 });
    q.add(c.task('a'));
    await flush();
    q.pause();
    expect(q.isPaused).toBe(true);
    q.add(c.task('b'));
    q.add(c.task('c'));
    q.add(c.task('d'));
    c.finish('a');
    await flush();
    expect(c.started).toEqual(['a']);
    expect(q.size).toBe(3);
    q.resume();
    expect(q.isPaused).toBe(false);
    await flush();
    expect(c.started).toEqual(['a', 'b', 'c']);
    expect(q.pending).toBe(2);
    q.resume(); // no-op, must not exceed the limit
    await flush();
    expect(c.started).toEqual(['a', 'b', 'c']);
  });

  it('onIdle() resolves immediately when idle and otherwise once everything has finished', async () => {
    const q = impl.createQueue({ concurrency: 1 });
    await expect(q.onIdle()).resolves.toBeUndefined();

    const c = controller();
    q.add(c.task('a'));
    q.add(c.task('b'));
    const idle1 = track(q.onIdle());
    const idle2 = track(q.onIdle());
    await flush();
    c.finish('a');
    await flush();
    expect(idle1.status).toBe('pending');
    c.finish('b');
    await flush();
    expect(idle1.status).toBe('fulfilled');
    expect(idle2.status).toBe('fulfilled');
  });

  it('a paused queue with waiting tasks is not idle', async () => {
    const q = impl.createQueue({ concurrency: 1 });
    q.pause();
    const done = vi.fn(() => 'ok');
    q.add(done);
    const idle = track(q.onIdle());
    await flush();
    await flush();
    expect(done).not.toHaveBeenCalled();
    expect(idle.status).toBe('pending');
    q.resume();
    await flush();
    expect(done).toHaveBeenCalledTimes(1);
    expect(idle.status).toBe('fulfilled');
  });
});

describeFollowUp(1, 'priority', () => {
  it('starts the highest priority waiting task next, FIFO within equal priorities', async () => {
    const c = controller();
    const q = impl.createQueue({ concurrency: 1 });
    q.add(c.task('running'));
    q.add(c.task('low'), { priority: -1 });
    q.add(c.task('normal-1'));
    q.add(c.task('high'), { priority: 5 });
    q.add(c.task('normal-2'), { priority: 0 });
    await flush();
    for (const name of ['running', 'high', 'normal-1', 'normal-2']) {
      c.finish(name);
      await flush();
    }
    expect(c.started).toEqual(['running', 'high', 'normal-1', 'normal-2', 'low']);
  });
});

describeFollowUp(2, 'retries', () => {
  it('re-runs a failing task up to `retries` extra times, then resolves', async () => {
    const q = impl.createQueue({ concurrency: 1 });
    let calls = 0;
    const flaky = () => {
      calls++;
      return calls < 3 ? Promise.reject(new Error(`attempt ${calls}`)) : Promise.resolve('third time lucky');
    };
    await expect(q.add(flaky, { retries: 2 })).resolves.toBe('third time lucky');
    expect(calls).toBe(3);
  });

  it('rejects with the last error once retries are exhausted', async () => {
    const q = impl.createQueue({ concurrency: 1 });
    let calls = 0;
    const alwaysFails = () => Promise.reject(new Error(`attempt ${++calls}`));
    await expect(q.add(alwaysFails, { retries: 1 })).rejects.toThrow('attempt 2');
    expect(calls).toBe(2);
  });
});

describeFollowUp(3, 'AbortSignal', () => {
  it('rejects immediately and never runs the task when the signal is already aborted', async () => {
    const q = impl.createQueue({ concurrency: 1 });
    const controllerA = new AbortController();
    controllerA.abort();
    const task = vi.fn(() => 'nope');
    const error = await q.add(task, { signal: controllerA.signal }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(DOMException);
    expect((error as DOMException).name).toBe('AbortError');
    expect(task).not.toHaveBeenCalled();
  });

  it('removes a waiting task when its signal aborts', async () => {
    const c = controller();
    const q = impl.createQueue({ concurrency: 1 });
    q.add(c.task('a'));
    const abort = new AbortController();
    const waiting = q.add(c.task('b'), { signal: abort.signal }).catch((e: unknown) => e);
    q.add(c.task('c'));
    await flush();
    expect(q.size).toBe(2);
    abort.abort();
    expect(((await waiting) as DOMException).name).toBe('AbortError');
    expect(q.size).toBe(1);
    c.finish('a');
    await flush();
    expect(c.started).toEqual(['a', 'c']);
  });

  it('passes the signal to a running task', async () => {
    const q = impl.createQueue({ concurrency: 1 });
    const abort = new AbortController();
    let seen: AbortSignal | undefined;
    await q.add(
      ({ signal }) => {
        seen = signal;
        return 'done';
      },
      { signal: abort.signal },
    );
    expect(seen).toBe(abort.signal);
  });
});
