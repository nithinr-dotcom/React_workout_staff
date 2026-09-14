export type AnyFn = (...args: any[]) => any;

/**
 * Placeholder for follow-up 1. Import it from here in your Solution and in tests:
 *   curried(__, 2)(1)
 * `Symbol.for` makes it the same value everywhere it is imported.
 */
export const __ = Symbol.for('s30.curry.placeholder');

export interface CurryModule {
  /** Collects arguments across calls until `arity` (default `fn.length`) are present, then calls `fn`. */
  curry(fn: AnyFn, arity?: number): AnyFn;
  /** Left to right: pipe(f, g, h)(x) === h(g(f(x))). */
  pipe(...fns: AnyFn[]): AnyFn;
  /** Right to left: compose(f, g, h)(x) === f(g(h(x))). */
  compose(...fns: AnyFn[]): AnyFn;
  /** Follow-up 2: like pipe, but awaits each step and always returns a Promise. */
  pipeAsync(...fns: AnyFn[]): (...args: any[]) => Promise<any>;
}
