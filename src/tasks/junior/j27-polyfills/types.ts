export type MapCallback<T, U> = (value: T, index: number, array: readonly T[]) => U;
export type Predicate<T> = (value: T, index: number, array: readonly T[]) => unknown;
export type Reducer<T, A> = (accumulator: A, value: T, index: number, array: readonly T[]) => A;

export type AnyFn = (this: any, ...args: any[]) => any;

export interface PolyfillsModule {
  /** Like `arr.map(cb, thisArg)`. */
  myMap<T, U>(arr: readonly T[], cb: MapCallback<T, U>, thisArg?: unknown): U[];

  /** Like `arr.filter(cb, thisArg)`. */
  myFilter<T>(arr: readonly T[], cb: Predicate<T>, thisArg?: unknown): T[];

  /** Like `arr.reduce(cb)` / `arr.reduce(cb, initialValue)`. An explicitly passed `undefined` counts as an initial value. */
  myReduce<T, A = T>(arr: readonly T[], cb: Reducer<T, A>, initialValue?: A): A;

  /** Like `fn.call(thisArg, ...args)`. */
  myCall<F extends AnyFn>(fn: F, thisArg: unknown, ...args: Parameters<F>): ReturnType<F>;

  /** Like `fn.apply(thisArg, args)`. */
  myApply<F extends AnyFn>(fn: F, thisArg: unknown, args?: Parameters<F> | null): ReturnType<F>;

  /** Like `fn.bind(thisArg, ...boundArgs)`. */
  myBind(fn: AnyFn, thisArg: unknown, ...boundArgs: unknown[]): AnyFn;
}
