import type { Executor, MyPromiseLike } from './types';

// ⬇ Delete this line when you start. Tests for this task are skipped while it exists.
export const NOT_STARTED = true;

export class MyPromise<T> implements MyPromiseLike<T> {
  constructor(executor: Executor<T>) {
    // Your implementation here. Requirements are in README.md.
    void executor;
    throw new Error('MyPromise: not implemented');
  }

  then<R1 = T, R2 = never>(
    onFulfilled?: ((value: T) => R1 | PromiseLike<R1>) | null,
    onRejected?: ((reason: any) => R2 | PromiseLike<R2>) | null,
  ): MyPromise<R1 | R2> {
    void onFulfilled;
    void onRejected;
    throw new Error('MyPromise.then: not implemented');
  }

  catch<R = never>(onRejected?: ((reason: any) => R | PromiseLike<R>) | null): MyPromise<T | R> {
    void onRejected;
    throw new Error('MyPromise.catch: not implemented');
  }

  finally(onFinally?: (() => unknown) | null): MyPromise<T> {
    void onFinally;
    throw new Error('MyPromise.finally: not implemented');
  }

  static resolve<T>(value: T | PromiseLike<T>): MyPromise<Awaited<T>> {
    void value;
    throw new Error('MyPromise.resolve: not implemented');
  }

  static reject<T = never>(reason?: unknown): MyPromise<T> {
    void reason;
    throw new Error('MyPromise.reject: not implemented');
  }

  /** Follow-up 1 */
  static all<T>(values: Iterable<T | PromiseLike<T>>): MyPromise<Awaited<T>[]> {
    void values;
    throw new Error('MyPromise.all: not implemented');
  }

  /** Follow-up 1 */
  static any<T>(values: Iterable<T | PromiseLike<T>>): MyPromise<Awaited<T>> {
    void values;
    throw new Error('MyPromise.any: not implemented');
  }
}
