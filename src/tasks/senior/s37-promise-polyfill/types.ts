export type ResolveFn<T> = (value: T | PromiseLike<T>) => void;
export type RejectFn = (reason?: unknown) => void;
export type Executor<T> = (resolve: ResolveFn<T>, reject: RejectFn) => void;

/** The instance side of MyPromise. Being a PromiseLike means `await` works on it. */
export interface MyPromiseLike<T> extends PromiseLike<T> {
  /** Registers handlers and returns a NEW promise that settles with what the handler returns or throws. */
  then<R1 = T, R2 = never>(
    onFulfilled?: ((value: T) => R1 | PromiseLike<R1>) | null,
    onRejected?: ((reason: any) => R2 | PromiseLike<R2>) | null,
  ): MyPromiseLike<R1 | R2>;
  /** Same as `then(undefined, onRejected)`. */
  catch<R = never>(onRejected?: ((reason: any) => R | PromiseLike<R>) | null): MyPromiseLike<T | R>;
  /** Runs `onFinally` with no arguments on either outcome and passes the original outcome through. */
  finally(onFinally?: (() => unknown) | null): MyPromiseLike<T>;
}

/** The static side of MyPromise. */
export interface MyPromiseConstructor {
  new <T>(executor: Executor<T>): MyPromiseLike<T>;
  /** Returns `value` itself if it is already a MyPromise; otherwise a MyPromise that adopts it. */
  resolve<T>(value: T | PromiseLike<T>): MyPromiseLike<Awaited<T>>;
  /** A MyPromise rejected with `reason`. */
  reject<T = never>(reason?: unknown): MyPromiseLike<T>;
  /** Follow-up 1: like Promise.all, built on your own class. */
  all<T>(values: Iterable<T | PromiseLike<T>>): MyPromiseLike<Awaited<T>[]>;
  /** Follow-up 1: like Promise.any, built on your own class. */
  any<T>(values: Iterable<T | PromiseLike<T>>): MyPromiseLike<Awaited<T>>;
}

export interface PromisePolyfillModule {
  MyPromise: MyPromiseConstructor;
}
