// ⚠ Unverified: written before the reference solution. If a test looks wrong, trust the README.
import { expect, it, vi } from 'vitest';
import { pickTarget } from '../../../test/target';
import * as Reference from './Reference';
import * as Solution from './Solution';
import type { AsyncFunc } from './types';

const { impl, describeTask, describeFollowUp } = pickTarget(Solution, Reference);

const flush = () => new Promise((r) => setTimeout(r, 0));

/** A callback-style function that calls back after `ms` real milliseconds with `map(input)`. */
function asyncFn(ms: number, map: (input: any) => any, log?: string[], label?: string): AsyncFunc {
  return (callback, input) => {
    log?.push(`start ${label}`);
    setTimeout(() => {
      log?.push(`end ${label}`);
      callback(undefined, map(input));
    }, ms);
  };
}

function failingFn(ms: number, error: Error): AsyncFunc {
  return (callback) => setTimeout(() => callback(error), ms);
}

/** Calls an AsyncFunc and resolves with the arguments of the final callback. */
function callAsync(fn: AsyncFunc, input: unknown) {
  const finalCallback = vi.fn();
  const done = new Promise<unknown[]>((resolve) => {
    finalCallback.mockImplementation((...args: unknown[]) => resolve(args));
  });
  fn(finalCallback, input);
  return { done, finalCallback };
}

function deferred<T = void>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describeTask('sequence / parallel / race (callback style)', () => {
  it('sequence runs functions one at a time, passing each output to the next', async () => {
    const log: string[] = [];
    const run = impl.sequence([
      asyncFn(10, (n) => n + 1, log, 'a'),
      asyncFn(1, (n) => n * 10, log, 'b'),
      asyncFn(5, (n) => `result ${n}`, log, 'c'),
    ]);
    const { done, finalCallback } = callAsync(run, 1);
    const [error, data] = await done;
    expect(error).toBeUndefined();
    expect(data).toBe('result 20');
    expect(log).toEqual(['start a', 'end a', 'start b', 'end b', 'start c', 'end c']);
    await flush();
    expect(finalCallback).toHaveBeenCalledTimes(1);
  });

  it('sequence stops at the first error and does not call later functions', async () => {
    const later = vi.fn();
    const boom = new Error('boom');
    const run = impl.sequence([asyncFn(1, (n) => n), failingFn(1, boom), later]);
    const { done, finalCallback } = callAsync(run, 1);
    const [error] = await done;
    expect(error).toBe(boom);
    await flush();
    expect(later).not.toHaveBeenCalled();
    expect(finalCallback).toHaveBeenCalledTimes(1);
  });

  it('parallel starts all functions with the same input and returns results in input order', async () => {
    const log: string[] = [];
    const run = impl.parallel([asyncFn(30, (n) => n + 1, log, 'slow'), asyncFn(1, (n) => n * 2, log, 'fast'), asyncFn(10, (n) => `${n}!`, log, 'mid')]);
    const { done, finalCallback } = callAsync(run, 5);
    expect(log).toEqual(['start slow', 'start fast', 'start mid']);
    const [error, data] = await done;
    expect(error).toBeUndefined();
    expect(data).toEqual([6, 10, '5!']);
    await flush();
    expect(finalCallback).toHaveBeenCalledTimes(1);
  });

  it('parallel calls back once with the first error, ignoring later results and errors', async () => {
    const first = new Error('first');
    const second = new Error('second');
    const run = impl.parallel([asyncFn(20, (n) => n), failingFn(5, first), failingFn(10, second)]);
    const { done, finalCallback } = callAsync(run, 1);
    const [error] = await done;
    expect(error).toBe(first);
    await new Promise((r) => setTimeout(r, 40));
    expect(finalCallback).toHaveBeenCalledTimes(1);
  });

  it('race calls back once, with whatever the first function to finish reported', async () => {
    const winner = impl.race([asyncFn(20, () => 'slow'), asyncFn(5, () => 'fast'), failingFn(10, new Error('mid'))]);
    const a = callAsync(winner, null);
    expect(await a.done).toEqual([undefined, 'fast']);

    const early = new Error('early');
    const loserFirstError = impl.race([asyncFn(20, () => 'slow'), failingFn(5, early)]);
    const b = callAsync(loserFirstError, null);
    expect((await b.done)[0]).toBe(early);

    await new Promise((r) => setTimeout(r, 40));
    expect(a.finalCallback).toHaveBeenCalledTimes(1);
    expect(b.finalCallback).toHaveBeenCalledTimes(1);
  });
});

describeTask('runInSequence (promise factories, no async/await)', () => {
  it('starts each task only after the previous one fulfilled, and resolves with results in order', async () => {
    const d1 = deferred<string>();
    const d2 = deferred<string>();
    const t1 = vi.fn(() => d1.promise);
    const t2 = vi.fn(() => d2.promise);
    const t3 = vi.fn(() => 'plain value');

    const result = impl.runInSequence<string>([t1, t2, t3]);
    expect(result).toBeInstanceOf(Promise);
    await flush();
    expect(t1).toHaveBeenCalledTimes(1);
    expect(t2).not.toHaveBeenCalled();

    d1.resolve('one');
    await flush();
    expect(t2).toHaveBeenCalledTimes(1);
    expect(t3).not.toHaveBeenCalled();

    d2.resolve('two');
    await expect(result).resolves.toEqual(['one', 'two', 'plain value']);
    await expect(impl.runInSequence([])).resolves.toEqual([]);
  });

  it('rejects with the first error (async or thrown) and starts nothing after it', async () => {
    const boom = new Error('boom');
    const after = vi.fn(() => Promise.resolve('never'));
    await expect(impl.runInSequence<unknown>([() => Promise.resolve(1), () => Promise.reject(boom), after])).rejects.toBe(boom);
    expect(after).not.toHaveBeenCalled();

    const thrown = new Error('thrown');
    const after2 = vi.fn();
    await expect(
      impl.runInSequence([
        () => {
          throw thrown;
        },
        after2,
      ]),
    ).rejects.toBe(thrown);
    expect(after2).not.toHaveBeenCalled();
  });

  it('is written without async/await', () => {
    const source = impl.runInSequence.toString();
    expect(source).not.toMatch(/^\s*async\b/);
    expect(source).not.toMatch(/\bawait\b/);
  });
});

describeTask('compose (Koa-style middleware)', () => {
  it('runs middleware in onion order and shares ctx', async () => {
    const ctx = { log: [] as string[] };
    const fn = impl.compose<typeof ctx>([
      async (c, next) => {
        c.log.push('a before');
        await next();
        c.log.push('a after');
      },
      async (c, next) => {
        c.log.push('b before');
        await new Promise((r) => setTimeout(r, 5));
        await next();
        c.log.push('b after');
      },
      (c) => {
        c.log.push('c');
      },
    ]);
    const result = fn(ctx);
    expect(result).toBeInstanceOf(Promise);
    await result;
    expect(ctx.log).toEqual(['a before', 'b before', 'c', 'b after', 'a after']);
  });

  it('calls the optional final next after the last middleware, and a middleware that skips next short-circuits', async () => {
    const final = vi.fn(() => Promise.resolve());
    const ctx = { log: [] as string[] };
    await impl.compose<typeof ctx>([async (_c, next) => next(), async (_c, next) => next()])(ctx, final);
    expect(final).toHaveBeenCalledTimes(1);

    const skipped = vi.fn();
    const final2 = vi.fn(() => Promise.resolve());
    await impl.compose<typeof ctx>([async () => {}, skipped])(ctx, final2);
    expect(skipped).not.toHaveBeenCalled();
    expect(final2).not.toHaveBeenCalled();

    await expect(impl.compose([])({})).resolves.toBeUndefined();
  });

  it('rejects when next() is called twice in the same middleware', async () => {
    let caught: unknown;
    const inner = vi.fn();
    const fn = impl.compose<object>([
      async (_c, next) => {
        await next();
        try {
          await next();
        } catch (error) {
          caught = error;
          throw error;
        }
      },
      inner,
    ]);
    const outcome = fn({});
    await expect(outcome).rejects.toThrow(/multiple times/i);
    expect(caught).toBeInstanceOf(Error);
    expect(inner).toHaveBeenCalledTimes(1);
  });

  it('propagates errors upstream, including synchronous throws, where try/catch around next() can handle them', async () => {
    const boom = new Error('boom');
    const syncThrower = () => {
      throw boom;
    };
    const unhandled = impl.compose<object>([async (_c, next) => next(), syncThrower]);
    let outcome: Promise<void> | undefined;
    expect(() => {
      outcome = unhandled({});
    }).not.toThrow();
    await expect(outcome).rejects.toBe(boom);

    const ctx = { status: 200, after: false };
    const handled = impl.compose<typeof ctx>([
      async (c, next) => {
        try {
          await next();
        } catch {
          c.status = 500;
        }
      },
      async (c, next) => {
        await next();
        c.after = true; // must not run: the error skips the rest of this middleware
      },
      async () => {
        throw boom;
      },
    ]);
    await expect(handled(ctx)).resolves.toBeUndefined();
    expect(ctx).toEqual({ status: 500, after: false });
  });
});

describeFollowUp(1, 'runInBatches', () => {
  it('runs each batch in parallel and the batches in sequence, keeping input order', async () => {
    const started: number[] = [];
    const gates = [0, 1, 2, 3, 4].map(() => deferred<number>());
    const tasks = gates.map((gate, i) => () => {
      started.push(i);
      return gate.promise;
    });
    const result = impl.runInBatches(tasks, 2);
    await flush();
    expect(started).toEqual([0, 1]);

    gates[1].resolve(10);
    await flush();
    expect(started).toEqual([0, 1]); // task 0 still running, so the batch isn't done

    gates[0].resolve(0);
    await flush();
    expect(started).toEqual([0, 1, 2, 3]);

    gates[3].resolve(30);
    gates[2].resolve(20);
    await flush();
    expect(started).toEqual([0, 1, 2, 3, 4]);
    gates[4].resolve(40);
    await expect(result).resolves.toEqual([0, 10, 20, 30, 40]);
  });
});
