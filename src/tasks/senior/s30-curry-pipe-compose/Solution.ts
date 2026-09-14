import type { AnyFn } from './types';

// ⬇ Delete this line when you start. Tests for this task are skipped while it exists.
export const NOT_STARTED = true;

export function curry(fn: AnyFn, arity: number = fn.length): AnyFn {
  // Your implementation here. Requirements are in README.md.
  void arity;
  throw new Error('curry: not implemented');
}

export function pipe(...fns: AnyFn[]): AnyFn {
  void fns;
  throw new Error('pipe: not implemented');
}

export function compose(...fns: AnyFn[]): AnyFn {
  void fns;
  throw new Error('compose: not implemented');
}

/** Follow-up 2. */
export function pipeAsync(...fns: AnyFn[]): (...args: any[]) => Promise<any> {
  void fns;
  throw new Error('pipeAsync: not implemented');
}
