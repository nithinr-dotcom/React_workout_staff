import type { MaybePromise, NodeCallback } from './types';

/*
 * Shared shape of every combinator:
 *   1. Return `new Promise(executor)`. Anything the executor throws (for example a generator
 *      blowing up during Array.from) turns into a rejection instead of a synchronous throw.
 *   2. Snapshot the iterable into an array first, so we know the count and can index results.
 *   3. Normalise each element with Promise.resolve(). That adopts thenables and plain values,
 *      and guarantees the callbacks run asynchronously.
 *   4. Settling a promise twice is a no-op, so "first one wins" needs no extra flag.
 */

export function promiseAll<T>(values: Iterable<MaybePromise<T>>): Promise<Awaited<T>[]> {
  return new Promise((resolve, reject) => {
    const items = Array.from(values);
    const results = new Array<Awaited<T>>(items.length);
    let remaining = items.length;
    if (remaining === 0) {
      resolve(results);
      return;
    }
    items.forEach((item, index) => {
      Promise.resolve(item).then((value) => {
        results[index] = value;
        remaining -= 1;
        if (remaining === 0) resolve(results);
      }, reject);
    });
  });
}

export function promiseAllSettled<T>(values: Iterable<MaybePromise<T>>): Promise<PromiseSettledResult<Awaited<T>>[]> {
  return new Promise((resolve) => {
    const items = Array.from(values);
    const results = new Array<PromiseSettledResult<Awaited<T>>>(items.length);
    let remaining = items.length;
    if (remaining === 0) {
      resolve(results);
      return;
    }
    const settle = (index: number, result: PromiseSettledResult<Awaited<T>>) => {
      results[index] = result;
      remaining -= 1;
      if (remaining === 0) resolve(results);
    };
    items.forEach((item, index) => {
      Promise.resolve(item).then(
        (value) => settle(index, { status: 'fulfilled', value }),
        (reason: unknown) => settle(index, { status: 'rejected', reason }),
      );
    });
  });
}

export function promiseAny<T>(values: Iterable<MaybePromise<T>>): Promise<Awaited<T>> {
  return new Promise((resolve, reject) => {
    const items = Array.from(values);
    const errors = new Array<unknown>(items.length);
    let remaining = items.length;
    if (remaining === 0) {
      reject(new AggregateError(errors, 'All promises were rejected'));
      return;
    }
    items.forEach((item, index) => {
      Promise.resolve(item).then(resolve, (reason: unknown) => {
        errors[index] = reason;
        remaining -= 1;
        if (remaining === 0) reject(new AggregateError(errors, 'All promises were rejected'));
      });
    });
  });
}

export function promiseRace<T>(values: Iterable<MaybePromise<T>>): Promise<Awaited<T>> {
  return new Promise((resolve, reject) => {
    // An empty iterable subscribes to nothing, so the promise stays pending forever, as in the spec.
    for (const item of values) {
      Promise.resolve(item).then(resolve, reject);
    }
  });
}

/* ---------- follow-ups ---------- */

export function promiseProps<T extends Record<string, unknown>>(object: T): Promise<{ [K in keyof T]: Awaited<T[K]> }> {
  const keys = Object.keys(object) as (keyof T)[];
  return promiseAll(keys.map((key) => object[key])).then((resolved) => {
    const out = {} as { [K in keyof T]: Awaited<T[K]> };
    keys.forEach((key, i) => {
      out[key] = resolved[i] as Awaited<T[typeof key]>;
    });
    return out;
  });
}

export function promisify<Args extends unknown[], R>(
  fn: (...args: [...Args, NodeCallback<R>]) => void,
): (...args: Args) => Promise<R> {
  return function (this: unknown, ...args: Args) {
    return new Promise<R>((resolve, reject) => {
      const callback: NodeCallback<R> = (error, result) => {
        if (error !== null && error !== undefined) reject(error);
        else resolve(result as R);
      };
      fn.apply(this, [...args, callback]);
    });
  };
}
