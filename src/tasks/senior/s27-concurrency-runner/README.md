# Concurrency-limited task runner

## Problem statement
You need to upload 500 files, or call a rate-limited API for 2,000 records. Firing everything at once overwhelms the browser and the server. Running one at a time is far too slow. Build two utilities that cap how much work runs in parallel:

1. **`mapAsyncLimit(items, limit, fn)`** works like `Promise.all(items.map(fn))`, except at most `limit` calls to `fn` are in flight at once.
2. **`createQueue({ concurrency })`** returns a long-lived queue. You `add` tasks to it over time, and you can `pause`, `resume` and wait for it to go idle.

This is one of the most common senior async questions. The interviewer is looking for correct ordering, error handling and "a slot frees up, so the next task starts" logic that doesn't leak or stall.

## Clarifying questions to ask
- Must `mapAsyncLimit` results be in input order or completion order? *(Input order.)*
- What happens in `mapAsyncLimit` when one call fails? *(Reject with that error immediately, and don't start any more items. Calls already in flight are left to finish, and their results are ignored.)*
- In the queue, does one failing task stop the others? *(No. Only that task's `add` promise rejects.)*
- Does a paused queue abort running tasks? *(No. It only stops new ones from starting.)*
- Can `fn` or a task throw synchronously, or return a plain value? *(Yes to both. Treat a throw as a rejection and a plain value as a fulfilment.)*
- Should a task start synchronously inside `add`? *(Not required. It must start no later than the next macrotask.)*

## Functional requirements
### `mapAsyncLimit(items, limit, fn)`
- [ ] Calls `fn(item, index)` for every item, with at most `limit` calls in flight at any moment.
- [ ] As soon as one call settles, the next item starts. Don't wait for the whole batch ("chunking" is wrong).
- [ ] Items start in input order.
- [ ] Fulfils with the results **in input order**.
- [ ] On the first rejection (or synchronous throw), rejects with that error and **starts no further items**.
- [ ] Empty `items` fulfils with `[]` without calling `fn`.
- [ ] `limit` must be an integer >= 1 or `Infinity`. Otherwise the returned promise rejects with a `RangeError`.
- [ ] Accepts any iterable, not just arrays.

### `createQueue({ concurrency })`
- [ ] Throws a `RangeError` synchronously if `concurrency` is not an integer >= 1 or `Infinity`.
- [ ] `add(task)` returns a promise that settles with the task's own result or error. Tasks are called with a context object `{ signal }`. `signal` is `undefined` unless follow-up 3 is implemented and one was passed.
- [ ] At most `concurrency` tasks run at once. Waiting tasks start in the order they were added (FIFO).
- [ ] A failing task doesn't affect other tasks or the queue.
- [ ] `size` is the number of tasks waiting and `pending` is the number running.
- [ ] `pause()` stops new tasks from starting. `isPaused` reflects it. Running tasks carry on.
- [ ] `resume()` starts as many waiting tasks as there are free slots.
- [ ] `onIdle()` resolves when `size === 0 && pending === 0`. If the queue is already idle, it resolves right away. A paused queue with waiting tasks is **not** idle.
- [ ] Multiple `onIdle()` calls made while busy all resolve when the queue next becomes idle.

## Non-functional requirements
- No libraries. Don't use `setInterval` or polling to detect free slots. Settle events should drive the scheduling.
- **Performance:** starting the next task must not scan every task ever added. Finished tasks leave the data structure.
- **Memory:** finished tasks and their results aren't retained by the queue.
- **No stalls:** a slot is always released, whether the task fulfils, rejects or throws synchronously.
- **Types:** `add` returns `Promise<T>` inferred from the task.

## Constraints
- 60 minutes.
- Export `mapAsyncLimit` and `createQueue` as named exports from `Solution.ts`.
- `Promise.all` and friends are allowed as helpers, but the concurrency control must be your own.

## Data / API contract
```ts
interface TaskContext { signal?: AbortSignal }
type Task<T> = (context: TaskContext) => T | PromiseLike<T>;

interface AddOptions {
  priority?: number;     // follow-up 1 (default 0, higher first)
  retries?: number;      // follow-up 2 (default 0)
  signal?: AbortSignal;  // follow-up 3
}

interface Queue {
  add<T>(task: Task<T>, options?: AddOptions): Promise<T>;
  pause(): void;
  resume(): void;
  onIdle(): Promise<void>;
  readonly size: number;     // waiting
  readonly pending: number;  // running
  readonly isPaused: boolean;
}

function mapAsyncLimit<T, R>(items: Iterable<T>, limit: number, fn: (item: T, index: number) => R | PromiseLike<R>): Promise<R[]>;
function createQueue(options: { concurrency: number }): Queue;
```

## Test contract
- Tests import `mapAsyncLimit` and `createQueue` as **named exports**.
- They use hand-made deferred promises to control when tasks finish, and `await new Promise((r) => setTimeout(r, 0))` to let scheduling happen. Your tasks must start within that window.
- They read `size`, `pending` and `isPaused` from the queue.
- Follow-up tests (`npm run test:followups -- s27`):
  - **1:** `add(task, { priority })`.
  - **2:** `add(task, { retries })`.
  - **3:** `add(task, { signal })`. The rejection is a `DOMException` with `name === 'AbortError'`.

## Edge cases
- `limit` larger than the number of items.
- `limit = Infinity`.
- `fn` returning a plain value, or throwing before returning a promise.
- In `mapAsyncLimit`, a second rejection after the first must not cause an unhandled rejection.
- A task that calls `queue.add` from inside itself (re-entrancy).
- `pause()` then `add()` then `onIdle()`: this must not resolve until after `resume()`.
- `resume()` on a queue that isn't paused is a no-op and must not exceed the concurrency limit.

## Follow-ups
1. **Priority.** `add(task, { priority })`: when a slot frees up, the waiting task with the highest priority starts next. Equal priorities stay FIFO. The default priority is `0`. What data structure would you use for 100k waiting tasks?
2. **Retries.** `add(task, { retries: n })`: when the task rejects, run it again, up to `n` extra times, before rejecting with the **last** error. A retrying task keeps its slot. Retries happen immediately; backoff is S32.
3. **AbortSignal.** `add(task, { signal })`:
   - If the signal is already aborted, or aborts while the task is **waiting**, remove the task from the queue and reject its promise with a `DOMException` named `AbortError`. The task never runs.
   - A **running** task receives the signal as `context.signal` and decides for itself how to stop. Don't retry after an abort.
4. **Settle-all mode.** Add `mapAsyncLimit(items, limit, fn, { stopOnError: false })`, which runs everything and resolves with `PromiseSettledResult`s. Discuss how you would expose partial progress to a UI, for example an upload list.
5. **Async iterables and backpressure.** Accept an `AsyncIterable` of items, for example lines streamed from a file, and pull the next item only when a slot is free. Why can't you call `Array.from` on the input anymore?

## Concepts covered
Promise orchestration · worker-pool pattern · order preservation under concurrency · fail-fast semantics · pause/resume state machines · idle detection · priority queues · AbortSignal propagation.

Related: S26 Promise combinators · S32 retry with backoff · S33 useFetch.
