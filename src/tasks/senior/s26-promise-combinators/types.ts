/** Anything the combinators accept per element: a plain value, a native promise, or any thenable. */
export type MaybePromise<T> = T | PromiseLike<T>;

/** Node-style callback: error first, result second. Used by follow-up 2. */
export type NodeCallback<R> = (error: unknown, result?: R) => void;

export interface PromiseCombinatorsModule {
  /** Fulfils with every value in input order, or rejects with the first rejection. */
  promiseAll<T>(values: Iterable<MaybePromise<T>>): Promise<Awaited<T>[]>;

  /** Fulfils with a settled-result object per input, in input order. Never rejects. */
  promiseAllSettled<T>(values: Iterable<MaybePromise<T>>): Promise<PromiseSettledResult<Awaited<T>>[]>;

  /** Fulfils with the first fulfilment, or rejects with an AggregateError once everything rejected. */
  promiseAny<T>(values: Iterable<MaybePromise<T>>): Promise<Awaited<T>>;

  /** Settles the same way as whichever input settles first. */
  promiseRace<T>(values: Iterable<MaybePromise<T>>): Promise<Awaited<T>>;

  /** Follow-up 1: `promiseAll` for an object of promises. */
  promiseProps<T extends Record<string, unknown>>(object: T): Promise<{ [K in keyof T]: Awaited<T[K]> }>;

  /** Follow-up 2: turn a Node-style callback API into a promise-returning function. */
  promisify<Args extends unknown[], R>(
    fn: (...args: [...Args, NodeCallback<R>]) => void,
  ): (...args: Args) => Promise<R>;
}
