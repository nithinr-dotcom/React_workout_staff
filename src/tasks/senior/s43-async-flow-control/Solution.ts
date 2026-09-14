import type { AsyncFunc, ComposedMiddleware, Middleware, PromiseFactory } from './types';

// ⬇ Delete this line when you start. Tests for this task are skipped while it exists.
export const NOT_STARTED = true;

export function sequence(funcs: AsyncFunc[]): AsyncFunc {
  // Your implementation here. Requirements are in README.md.
  void funcs;
  throw new Error('sequence: not implemented');
}

export function parallel(funcs: AsyncFunc[]): AsyncFunc<any, any[]> {
  void funcs;
  throw new Error('parallel: not implemented');
}

export function race(funcs: AsyncFunc[]): AsyncFunc {
  void funcs;
  throw new Error('race: not implemented');
}

export function runInSequence<T>(tasks: PromiseFactory<T>[]): Promise<T[]> {
  void tasks;
  throw new Error('runInSequence: not implemented');
}

export function compose<Ctx>(middlewares: Middleware<Ctx>[]): ComposedMiddleware<Ctx> {
  void middlewares;
  throw new Error('compose: not implemented');
}

/** Follow-up 1 */
export function runInBatches<T>(tasks: PromiseFactory<T>[], size: number): Promise<T[]> {
  void tasks;
  void size;
  throw new Error('runInBatches: not implemented');
}
