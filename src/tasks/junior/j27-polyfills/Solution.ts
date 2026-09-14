import type { AnyFn, MapCallback, Predicate, Reducer } from './types';

// ⬇ Delete this line when you start. Tests for this task are skipped while it exists.
export const NOT_STARTED = true;

// Your implementation here. Requirements are in README.md.
// Don't use the native Array.prototype.map/filter/reduce/forEach, Function.prototype.call/apply/bind or Reflect.apply.

export function myMap<T, U>(arr: readonly T[], cb: MapCallback<T, U>, thisArg?: unknown): U[] {
  void arr;
  void cb;
  void thisArg;
  throw new Error('myMap: not implemented');
}

export function myFilter<T>(arr: readonly T[], cb: Predicate<T>, thisArg?: unknown): T[] {
  void arr;
  void cb;
  void thisArg;
  throw new Error('myFilter: not implemented');
}

export function myReduce<T, A = T>(arr: readonly T[], cb: Reducer<T, A>, initialValue?: A): A {
  void arr;
  void cb;
  void initialValue;
  throw new Error('myReduce: not implemented');
}

export function myCall<F extends AnyFn>(fn: F, thisArg: unknown, ...args: Parameters<F>): ReturnType<F> {
  void fn;
  void thisArg;
  void args;
  throw new Error('myCall: not implemented');
}

export function myApply<F extends AnyFn>(fn: F, thisArg: unknown, args?: Parameters<F> | null): ReturnType<F> {
  void fn;
  void thisArg;
  void args;
  throw new Error('myApply: not implemented');
}

export function myBind(fn: AnyFn, thisArg: unknown, ...boundArgs: unknown[]): AnyFn {
  void fn;
  void thisArg;
  void boundArgs;
  throw new Error('myBind: not implemented');
}
