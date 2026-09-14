/** Error-first callback, as in BFE: `callback(error)` or `callback(undefined, data)`. */
export type Callback<T = any> = (error: unknown, data?: T) => void;

/** A callback-style async function: does some work with `input`, then calls `callback` exactly once. */
export type AsyncFunc<In = any, Out = any> = (callback: Callback<Out>, input: In) => void;

/** A function that starts some work and returns a promise for it. */
export type PromiseFactory<T = unknown> = () => PromiseLike<T> | T;

export type Next = () => Promise<void>;
export type Middleware<Ctx> = (ctx: Ctx, next: Next) => unknown;
/** The composed pipeline. `next` is an optional function called after the last middleware. */
export type ComposedMiddleware<Ctx> = (ctx: Ctx, next?: Next) => Promise<void>;

export interface AsyncFlowModule {
  /** Runs `funcs` one after another, feeding each output into the next. Stops at the first error. */
  sequence(funcs: AsyncFunc[]): AsyncFunc;
  /** Runs `funcs` at the same time with the same input. Collects outputs in input order. */
  parallel(funcs: AsyncFunc[]): AsyncFunc<any, any[]>;
  /** Runs `funcs` at the same time. The first one to call back, with an error or data, decides the result. */
  race(funcs: AsyncFunc[]): AsyncFunc;
  /** Starts each factory only after the previous promise fulfilled. Written without async/await. */
  runInSequence<T>(tasks: PromiseFactory<T>[]): Promise<T[]>;
  /** Koa-style middleware composition. */
  compose<Ctx>(middlewares: Middleware<Ctx>[]): ComposedMiddleware<Ctx>;

  /** Follow-up 1: batches of `size` run in parallel, batches run in sequence. */
  runInBatches<T>(tasks: PromiseFactory<T>[], size: number): Promise<T[]>;
}
