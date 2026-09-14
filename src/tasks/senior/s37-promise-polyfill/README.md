# Promise from scratch

## Problem statement
Implement `class MyPromise` without using the native `Promise` anywhere in your implementation. It must behave like the real thing closely enough that `await new MyPromise(...)` works and chains of `then`, `catch` and `finally` produce the same results as native promises.

This is the "go one level deeper" question. Dream11 and Airbnb ask it outright. Google has used it as the follow-up after a retry question: "now write the promise yourself". S26 had you combine promises; here you build the primitive that everything else sits on.

Your class needs:
- A constructor that takes an `executor(resolve, reject)`.
- `then(onFulfilled, onRejected)`, `catch(onRejected)` and `finally(onFinally)`.
- The statics `MyPromise.resolve(value)` and `MyPromise.reject(reason)`.

## Clarifying questions to ask
- Do handlers run synchronously if the promise is already settled? *(No. Handlers always run asynchronously, as microtasks scheduled with `queueMicrotask`.)*
- Which spec do we follow, Promises/A+ or ECMAScript? *(The observable results must match native promises. Exact tick counts for thenable adoption don't matter.)*
- What does `resolve(x)` do when `x` is itself a promise or a thenable? *(It adopts it: the outer promise follows whatever `x` eventually does.)*
- What if a handler returns the very promise that `then` returned? *(That promise rejects with a `TypeError`.)*
- What if the executor throws after calling `resolve`? *(The throw is ignored. The first settle wins.)*
- Do we need `all`, `race` and friends? *(Not in the base version. `all` and `any` are follow-up 1.)*

## Functional requirements
### Constructor
- [ ] `new MyPromise(executor)` calls `executor(resolve, reject)` **synchronously**.
- [ ] A promise settles at most once. Later calls to `resolve` or `reject` are ignored.
- [ ] If the executor throws before settling, the promise rejects with the thrown value.

### Resolution
- [ ] `resolve(value)` with a plain value (including `undefined`, `null` and objects without a `then` method) fulfils with it.
- [ ] `resolve(x)` where `x` is a MyPromise, a native promise or any thenable **adopts** `x`, including when `x` settles later or rejects.
- [ ] A thenable's `then` is called with `x` as `this`. If it calls its callbacks more than once, or calls one and then throws, only the first call counts.
- [ ] If reading `x.then` or calling it throws before a callback ran, the promise rejects with that error.
- [ ] Resolving a promise with **itself** rejects it with a `TypeError`.
- [ ] `reject(reason)` never adopts: rejecting with a promise uses that promise object as the reason.

### then / catch / finally
- [ ] `then` returns a **new** MyPromise every time.
- [ ] Handlers run asynchronously via `queueMicrotask`: never before the current synchronous code finishes, and before any `setTimeout(…, 0)` callback.
- [ ] Handlers registered **after** the promise settled still run.
- [ ] Several `then` calls on the same promise each run, in registration order, with the same value.
- [ ] The promise returned by `then` resolves with the handler's return value (adopting it if it is thenable), or rejects with what the handler throws.
- [ ] A missing (or non-function) handler passes the value or reason through to the next promise.
- [ ] `catch(onRejected)` behaves exactly like `then(undefined, onRejected)`.
- [ ] `finally(onFinally)` calls `onFinally` with no arguments, then settles with the **original** outcome. If `onFinally` throws, or returns a promise that rejects, that error wins instead. If it returns a promise, the chain waits for it.

### Statics
- [ ] `MyPromise.resolve(value)` returns `value` itself if it is already a `MyPromise`. Otherwise it returns a new MyPromise that adopts `value`.
- [ ] `MyPromise.reject(reason)` returns a MyPromise rejected with `reason`.

## Non-functional requirements
- No libraries, and no native `Promise` inside your implementation (no `new Promise`, `Promise.resolve`, `async`/`await`). `queueMicrotask` is the only scheduler.
- **Memory:** once a promise settles, drop its handler list so handlers can be garbage collected.
- **Types:** keep the signatures from `types.ts`. `MyPromise.resolve(1).then((n) => String(n))` should infer `MyPromise<string>`.
- Settled state and value must not be writable from outside the class (private fields or a closure).

## Constraints
- 75 minutes.
- Export `MyPromise` as a named export (a class) from `Solution.ts`. The contract lives in `types.ts`.

## Data / API contract
```ts
type Executor<T> = (resolve: (value: T | PromiseLike<T>) => void, reject: (reason?: unknown) => void) => void;

class MyPromise<T> implements PromiseLike<T> {
  constructor(executor: Executor<T>);
  then<R1 = T, R2 = never>(
    onFulfilled?: ((value: T) => R1 | PromiseLike<R1>) | null,
    onRejected?: ((reason: any) => R2 | PromiseLike<R2>) | null,
  ): MyPromise<R1 | R2>;
  catch<R = never>(onRejected?: ((reason: any) => R | PromiseLike<R>) | null): MyPromise<T | R>;
  finally(onFinally?: (() => unknown) | null): MyPromise<T>;

  static resolve<T>(value: T | PromiseLike<T>): MyPromise<Awaited<T>>;
  static reject<T = never>(reason?: unknown): MyPromise<T>;

  // Follow-up 1
  static all<T>(values: Iterable<T | PromiseLike<T>>): MyPromise<Awaited<T>[]>;
  static any<T>(values: Iterable<T | PromiseLike<T>>): MyPromise<Awaited<T>>;
}
```

## Test contract
- Tests use `MyPromise` as a **named export** and construct it with `new`.
- Outcomes are observed by calling `then(onFulfilled, onRejected)` on your promise, and sometimes with `await`.
- Tests wait with `await new Promise((r) => setTimeout(r, 0))` so the microtask queue drains. Everything in a chain that doesn't involve timers must have settled by then.
- "Runs as a microtask" is checked by recording the order of synchronous code, your handler, and a `setTimeout(…, 0)` callback.
- Tests check `instanceof MyPromise` on values returned by `then`, `catch`, `finally`, `resolve` and `reject`.
- Errors are compared by identity (`toBe`), except the self-resolution error, which is checked with `toBeInstanceOf(TypeError)`.
- Follow-up tests (`npm run test:followups -- s37`) use `MyPromise.all` and `MyPromise.any`.

## Edge cases
- `resolve(undefined)` and a handler that returns nothing: both fulfil with `undefined`.
- `then` called with non-function arguments such as `then(42, 'x')`.
- An object whose `then` property is a getter that throws.
- A thenable that calls `resolvePromise` synchronously and then throws.
- A thenable that resolves with **another** thenable (recursive adoption).
- A long chain of 10 000 `then` calls must not overflow the stack.
- `finally` returning a value: the value is ignored and the original value passes through.

## Follow-ups
1. **`MyPromise.all` and `MyPromise.any`.** Add both as statics on your class, using only your own `then`. `all` fulfils with values in input order or rejects with the first rejection. `any` fulfils with the first fulfilment, or rejects with an `AggregateError` (reasons in input order) once everything has rejected. Empty input: `all` fulfils with `[]`; `any` rejects with an `AggregateError`.
2. **Cancellation (Dream11 bonus).** Add `cancel()` to instances. Cancelling a pending promise means none of its handlers run, and every promise derived from it through `then` rejects with an error named `CancelError`. Cancelling a settled promise does nothing. Why did TC39 reject cancellable promises, and why did `AbortController` win?
3. **Promises/A+ edge cases.** Run your class against the official `promises-aplus-tests` suite (an adapter with `deferred()` is all it needs). Where does A+ differ from ECMAScript? Hint: when a thenable's `then` is called, and why `await nativePromise` takes fewer ticks than `await myPromise`.
4. **Unhandled rejection tracking.** Add `MyPromise.onUnhandledRejection = (reason, promise) => {}`. Call it when a promise rejects and still has no rejection handler after a macrotask. If a handler is attached later, call `MyPromise.onRejectionHandled(promise)`. How do browsers decide when to fire `unhandledrejection`?
5. **Ordering puzzle.** Predict the log order for a mix of `setTimeout`, `queueMicrotask`, `MyPromise.resolve().then` and `await` in an async function. Then run it in the Playground against both your class and native `Promise`, and explain each difference.

## Concepts covered
Promise state machine (pending → fulfilled / rejected) · the promise resolution procedure · microtasks vs macrotasks · thenable adoption and "first call wins" guards · error propagation through chains · `finally` pass-through semantics · private class fields.

Related: S26 Promise combinators · S27 Concurrency-limited task runner · S32 retry with backoff · J27 Polyfills.
