# Async flow: sequence, parallel, race & middleware pipeline

## Problem statement
Before promises there were callbacks, and interviewers still use them to check whether you understand async control flow itself rather than the syntax around it. This task has three parts:

1. **Callback helpers (BFE #29–31).** Functions look like `(callback, input) => void` and call `callback(error)` or `callback(undefined, data)` exactly once. Build:
   - `sequence(funcs)`: run them one after another, each receiving the previous output.
   - `parallel(funcs)`: run them all at once with the same input and collect the results.
   - `race(funcs)`: run them all at once; the first one to call back wins.

   Each helper returns a new function with the same `(finalCallback, input)` shape, so the helpers can be nested inside each other.
2. **`runInSequence(tasks)` without `async`/`await`.** Flipkart's UI2 round in 2025 asked for exactly this: "run these promises in parallel, then in sequence, without async/await". The parallel half is `Promise.all` (you built that in S26). The sequence half is a `reduce` over `.then`.
3. **`compose(middlewares)`, Koa-style.** Each middleware is `(ctx, next) => Promise`. Code before `await next()` runs on the way in and code after it runs on the way out, like layers of an onion. This is how Koa, Redux middleware and many fetch interceptors work.

## Clarifying questions to ask
- In `sequence`, what does the final callback receive? *(`(undefined, outputOfLastFunction)`. With no functions, `(undefined, input)`.)*
- In `parallel`, what order are the results in? *(Input order, not completion order. With no functions, `(undefined, [])`.)*
- What happens after `parallel` has reported an error? *(Later results and errors are ignored. The final callback is called exactly once.)*
- In `race`, does an error count as finishing? *(Yes. Whoever calls back first, with an error or data, decides the result.)*
- What if a function calls its callback twice? *(Only the first call counts.)*
- What does `runInSequence` resolve with? *(An array of every task's result, in order. On the first rejection or synchronous throw it rejects with that error and starts no more tasks.)*
- Why "task factories" and not promises? *(A promise has already started. To control when work starts you need `() => Promise`.)*
- In `compose`, what happens when a middleware calls `next()` twice? *(The second call returns a rejected promise with an `Error` whose message contains `next() called multiple times`.)*
- Can the composed function throw synchronously? *(No. It always returns a promise, and a synchronous throw in any middleware becomes a rejection.)*

## Functional requirements
### Callback helpers
- [ ] `sequence(funcs)(finalCallback, input)` calls `funcs[0]` with `input`, then each next function with the previous function's data, one at a time.
- [ ] `sequence` stops at the first error: `finalCallback(error)`, and later functions are never called.
- [ ] `parallel(funcs)(finalCallback, input)` starts every function immediately with the same `input`.
- [ ] `parallel` calls `finalCallback(undefined, results)` with results in input order once all have succeeded, or `finalCallback(error)` for the first error.
- [ ] `race(funcs)(finalCallback, input)` starts every function and forwards the first callback, `(error, data)`, as it is.
- [ ] In every helper, `finalCallback` is called exactly once.

### runInSequence
- [ ] Returns a `Promise` that resolves with every task's result, in order. An empty array resolves with `[]`.
- [ ] Task `n + 1` is not started until task `n`'s promise has fulfilled. Tasks may return plain values.
- [ ] Rejects with the first rejection or synchronous throw, and starts nothing after it.
- [ ] Written **without `async` or `await`**, using `reduce` and `.then`.

### compose
- [ ] `compose(middlewares)` throws a `TypeError` right away if it isn't given an array of functions.
- [ ] The returned `(ctx, next?)` function runs the middleware in array order. Each middleware receives the same `ctx` and a `next` that runs the rest of the chain and returns a promise.
- [ ] Code after `await next()` runs after everything downstream has finished (onion order).
- [ ] After the last middleware, the optional `next` passed to the composed function is called.
- [ ] A middleware that doesn't call `next` stops the chain there.
- [ ] Always returns a promise that resolves with `undefined`, including for an empty array.
- [ ] Calling `next()` twice in one middleware rejects with `next() called multiple times`.
- [ ] Errors, thrown or rejected, propagate to the upstream middleware's `await next()`, where `try/catch` can handle them. Unhandled errors reject the composed promise.

## Non-functional requirements
- No libraries. Don't use `async`/`await` in `runInSequence`. It's fine elsewhere.
- **No stack growth problems:** `sequence` over 10,000 functions that call back synchronously is a nice-to-have, not tested. Know why a naive version overflows the stack.
- **Types:** keep the signatures in `types.ts`.

## Constraints
- 70 minutes.
- Export `sequence`, `parallel`, `race`, `runInSequence` and `compose` (plus `runInBatches` for follow-up 1) as named exports from `Solution.ts`.
- `Promise.resolve`, `Promise.reject` and `new Promise` are allowed everywhere. `Promise.all` is allowed in follow-up 1.

## Data / API contract
```ts
type Callback<T = any> = (error: unknown, data?: T) => void;
type AsyncFunc<In = any, Out = any> = (callback: Callback<Out>, input: In) => void;
type PromiseFactory<T = unknown> = () => PromiseLike<T> | T;

type Next = () => Promise<void>;
type Middleware<Ctx> = (ctx: Ctx, next: Next) => unknown;
type ComposedMiddleware<Ctx> = (ctx: Ctx, next?: Next) => Promise<void>;

function sequence(funcs: AsyncFunc[]): AsyncFunc;
function parallel(funcs: AsyncFunc[]): AsyncFunc<any, any[]>;
function race(funcs: AsyncFunc[]): AsyncFunc;
function runInSequence<T>(tasks: PromiseFactory<T>[]): Promise<T[]>;
function compose<Ctx>(middlewares: Middleware<Ctx>[]): ComposedMiddleware<Ctx>;

// Follow-up 1
function runInBatches<T>(tasks: PromiseFactory<T>[], size: number): Promise<T[]>;
```

## Test contract
- Tests import every function as a **named export**.
- Callback helpers are tested with functions that call back after short real `setTimeout` delays. Tests check the arguments of the final callback and that it was called exactly once.
- `runInSequence` is tested with hand-made deferred promises and `await new Promise((r) => setTimeout(r, 0))` to check which tasks have started.
- The "no async/await" test reads `runInSequence.toString()` and expects no leading `async` keyword and no `await`. Helpers you call from it aren't checked, but the spirit is no `async`/`await` at all.
- `compose` errors for a double `next()` are matched with `/multiple times/i`.
- Follow-up tests (`npm run test:followups -- s43`) call `runInBatches(tasks, size)`.

## Edge cases
- `sequence([])` and `parallel([])`: call back with `input` and `[]` respectively.
- A function that calls its callback synchronously, without any delay.
- A function that calls back twice, or with an error and then with data.
- `parallel` where two functions fail: only the first error is reported.
- `runInSequence` task that returns a thenable or a plain value.
- A middleware that calls `next()` without `await`ing it, then returns. What order do you get? *(Not tested; explain it.)*
- A middleware that throws after `await next()` has already completed.

## Follow-ups
1. **Batches.** Flipkart's variant: "run the tasks in batches of `size`: each batch in parallel, batches one after another". Implement `runInBatches(tasks, size)`, resolving with all results in input order. A batch starts only when every task of the previous batch has fulfilled. How is this different from S27's sliding-window limit, and when is batching the better choice?
2. **Promise versions.** Write `sequence`, `parallel` and `race` again for promise-returning functions `(input) => Promise`. Which of them map directly onto `Promise.all`, `Promise.race` and `reduce`? Then write `callbackify(fn)` so the callback helpers accept promise-returning functions too.
3. **Cancellation.** `race` leaves the losers running. Change the function shape to `(callback, input, signal)` and abort the losers once there is a winner. Do the same for `runInSequence(tasks, { signal })`: after an abort, start no more tasks and reject with an `AbortError`.
4. **Redux middleware.** Redux middleware has the shape `store => next => action`, and it's synchronous. Write `applyMiddleware(...middlewares)(dispatch)` with the same onion order. What changes when there is no promise, and how does redux-thunk fit in?
5. **Error middleware.** Express puts error handlers in the chain as `(err, req, res, next)`. Add that to your `compose`: when a middleware fails, skip to the next error handler. Which design is easier to reason about, Koa's try/catch or Express's error handlers?

## Concepts covered
Error-first callbacks · control flow without promises · exactly-once completion · order preservation · `reduce` + `.then` chains · promise factories vs promises · Koa's onion model · re-entrancy guards (`next()` twice) · error propagation through async layers.

Related: S26 Promise combinators · S27 Concurrency-limited task runner · S30 curry, pipe & compose · ST05 Mini Redux.
