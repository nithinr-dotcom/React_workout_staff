import type { MaybePromise, NodeCallback } from './types';

// ⬇ Delete this line when you start. Tests for this task are skipped while it exists.
export const NOT_STARTED = true;

export function promiseAll<T>(values: Iterable<MaybePromise<T>>): Promise<Awaited<T>[]> {
  // Your implementation here. Requirements are in README.md.
  void values;
  throw new Error('promiseAll: not implemented');
}

export function promiseAllSettled<T>(values: Iterable<MaybePromise<T>>): Promise<PromiseSettledResult<Awaited<T>>[]> {
  void values;
  throw new Error('promiseAllSettled: not implemented');
}

export function promiseAny<T>(values: Iterable<MaybePromise<T>>): Promise<Awaited<T>> {
  void values;
  throw new Error('promiseAny: not implemented');
}

export function promiseRace<T>(values: Iterable<MaybePromise<T>>): Promise<Awaited<T>> {
  void values;
  throw new Error('promiseRace: not implemented');
}

/** Follow-up 1 */
export function promiseProps<T extends Record<string, unknown>>(object: T): Promise<{ [K in keyof T]: Awaited<T[K]> }> {
  void object;
  throw new Error('promiseProps: not implemented');
}

/** Follow-up 2 */
export function promisify<Args extends unknown[], R>(
  fn: (...args: [...Args, NodeCallback<R>]) => void,
): (...args: Args) => Promise<R> {
  void fn;
  throw new Error('promisify: not implemented');
}
