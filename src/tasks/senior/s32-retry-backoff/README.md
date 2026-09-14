# retry with backoff & cancellable timeout

## Problem statement
Networks fail. Build the three small async utilities that every data layer ends up needing:

- `sleep(ms, signal?)` resolves after `ms` milliseconds, and can be cancelled.
- `withTimeout(promise, ms, signal?)` settles like `promise`, unless `ms` passes first, in which case it rejects with a timeout error.
- `retry(fn, options)` calls an async function and, when it fails, tries again after an exponentially growing delay. It supports a cap, jitter, a predicate that decides which errors are retryable, and an `AbortSignal` that cancels everything.

The interviewer cares less about the happy path than about the edges: no leaked timers, no attempts after abort, no swallowed errors, and deterministic tests.

## Clarifying questions to ask
- How is the delay computed? *(Before retry number `n` (1-based), wait `min(maxDelay, baseDelay * factor^(n-1))`. With `jitter: true`, multiply that by `random()`.)*
- What does `retries` count? *(Retries after the first attempt. `retries: 3` means up to 4 calls.)*
- After the last attempt fails, what's the rejection value? *(The last error, unwrapped.)*
- What does `attempt` mean in `fn(attempt)` and `shouldRetry(error, attempt)`? *(1-based number of the call. In `shouldRetry` it's the attempt that just failed.)*
- What happens on abort while an attempt is in flight? *(`retry` rejects right away with an `AbortError` and makes no further calls. It can't cancel `fn` itself; passing a signal into `fn` is a follow-up.)*
- What does the timeout error look like? *(An `Error` whose `name` is `'TimeoutError'`.)*
- Does `withTimeout` cancel the underlying work? *(No, it only stops waiting. The caller owns the work.)*
- Is the first attempt delayed? *(No. The first call happens without waiting.)*

## Functional requirements
### sleep
- [ ] Resolves with `undefined` after `ms` milliseconds.
- [ ] If `signal` is already aborted, rejects immediately with an error named `AbortError`.
- [ ] If `signal` aborts before the time is up, rejects with an `AbortError` and clears its timer.
- [ ] Removes its abort listener once it settles.

### withTimeout
- [ ] Resolves or rejects with the same value or error as `promise` if it settles within `ms`.
- [ ] Otherwise rejects with an error named `TimeoutError` after `ms`.
- [ ] Clears its timer as soon as the outcome is decided, so no timer is left pending.
- [ ] If `signal` aborts first (or is already aborted), rejects with an `AbortError`.

### retry
- [ ] Calls `fn(1)` immediately. If it resolves, `retry` resolves with that value.
- [ ] On failure, if attempts remain and `shouldRetry(error, attempt)` returns true, waits the backoff delay and calls `fn(attempt + 1)`.
- [ ] Delay before retry `n` is `min(maxDelay, baseDelay * factor^(n-1))`, multiplied by `random()` when `jitter` is true.
- [ ] Defaults: `retries: 3`, `baseDelay: 100`, `factor: 2`, `maxDelay: Infinity`, `jitter: false`, `random: Math.random`, `shouldRetry: () => true`.
- [ ] When retries run out or `shouldRetry` returns false, rejects with the **last** error immediately, without waiting.
- [ ] `signal` already aborted: rejects with an `AbortError` without calling `fn`.
- [ ] `signal` aborted during a backoff wait: rejects with an `AbortError` promptly, clears the timer and never calls `fn` again.
- [ ] `signal` aborted while an attempt is in flight: rejects with an `AbortError` promptly, and the attempt's later result is ignored.
- [ ] `fn` throwing synchronously counts as a failed attempt, the same as returning a rejected promise.

## Non-functional requirements
- No libraries. `setTimeout`, `clearTimeout`, `AbortSignal` and promises only.
- No leaked timers or abort listeners after any outcome.
- No unhandled promise rejections, including from attempts whose result is ignored after an abort.
- Deterministic under fake timers: the only randomness comes from the injected `random`.

## Constraints
- 60 minutes.
- Export `sleep`, `withTimeout` and `retry` as named exports from `Solution.ts`. The contract lives in `types.ts`.
- `retry` should reuse `sleep`.

## Data / API contract
```ts
interface RetryOptions {
  retries?: number;      // default 3
  baseDelay?: number;    // default 100 (ms)
  factor?: number;       // default 2
  maxDelay?: number;     // default Infinity
  jitter?: boolean;      // default false
  random?: () => number; // default Math.random
  shouldRetry?: (error: unknown, attempt: number) => boolean; // default () => true
  signal?: AbortSignal;
}

function sleep(ms: number, signal?: AbortSignal): Promise<void>;
function withTimeout<T>(promise: Promise<T>, ms: number, signal?: AbortSignal): Promise<T>;
function retry<T>(fn: (attempt: number) => Promise<T>, options?: RetryOptions): Promise<T>;
```

## Test contract
- Tests call `sleep`, `withTimeout` and `retry` as named exports of the module.
- Tests use `vi.useFakeTimers()` and `await vi.advanceTimersByTimeAsync(ms)`, checking call counts just before and exactly at each expected delay.
- Abort and timeout errors are checked by their `name` property only (`'AbortError'`, `'TimeoutError'`), so a `DOMException` or an `Error` with that name both pass.
- Leaks are checked with `vi.getTimerCount()` being `0` after an outcome.
- Tests abort with `new AbortController().abort()` (no custom reason).

## Edge cases
- `retries: 0`: exactly one call, no timers.
- `baseDelay: 0`: retries still go through a (zero-length) timer, never a tight synchronous loop.
- Abort between an attempt failing and the backoff timer starting.
- An attempt that resolves after the signal aborted must not turn the rejected `retry` into a resolved one.
- `withTimeout` with a promise that is already resolved: it must win, even with `ms = 0`.
- `shouldRetry` itself throwing: decide and state what `retry` does.

## Follow-ups
1. **Per-attempt signal.** Pass `{ attempt, signal }` to `fn`, where `signal` aborts when the outer signal aborts, so an in-flight `fetch` is actually cancelled rather than just ignored.
2. **Per-attempt timeout.** Add `attemptTimeout` (ms). A slow attempt is aborted and counted as a failure (retryable by default). Compose it from `withTimeout` and follow-up 1.
3. **Honour Retry-After.** If the error carries `retryAfterMs` (for example from a `429` response), wait that long instead of the computed delay, still capped by `maxDelay`. Add an `onRetry(error, attempt, delay)` hook for logging.
4. **Circuit breaker.** Wrap `retry` in a breaker that opens after N consecutive failures across calls, fails fast while open, and lets one trial call through after a cool-down. Where should that state live in a React app?
5. **Jitter strategies.** Compare no jitter, full jitter and decorrelated jitter for 10 000 clients retrying after an outage. Why does jitter matter more than the exponent?

## Concepts covered
`AbortController` / `AbortSignal` · racing a promise against a timer · exponential backoff with a cap · jitter via an injected random source · timer and listener cleanup · testing async code with fake timers.

Related: J23 debounce · S26 Promise combinators · S27 Concurrency-limited task runner · S33 useFetch with abort + cache.
