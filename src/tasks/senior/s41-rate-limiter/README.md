# Rate limiter & hit counter

## Problem statement
Two related pieces, both built on the idea of a **rolling time window**.

**Part A: hit counter.** Dropbox's classic: `log_hit()` and `get_hits_in_last_five_minutes()`. Write `createHitCounter(windowMs, now)` with `hit()` and `count()`. The catch is scale. A viral page can log 50 000 hits in the same millisecond, so storing one entry per hit isn't acceptable. Memory must stay bounded by the window, not by the traffic.

**Part B: rate limiter.** Uber's specialisation round asks for a client-side limiter: "at most `limit` calls in any `windowMs`". Write `createRateLimiter({ limit, windowMs, now, onLimit })`:
- `tryAcquire()` answers "can I go now?" using a **sliding-window log**. There are no fixed buckets that reset on the minute.
- `wrap(fn)` returns a rate-limited version of `fn`. Over the limit, it either rejects with a `RateLimitError` or queues the call until a permit frees up, depending on `onLimit`.

## Clarifying questions to ask
- Does a hit at time `t` still count at exactly `t + windowMs`? *(No. It counts while `now() - t < windowMs`.)*
- How precise must the counter be? *(Exact to the millisecond. A coarser, fixed-bucket approximation is a discussion point, not the base version.)*
- Can the clock go backwards? *(No. Assume `now()` never decreases.)*
- In Part B, does a failed `tryAcquire()` count as an attempt? *(No. Only successful acquisitions use up the window.)*
- When a wrapped call is over the limit, what's the default? *(`'reject'`. `'queue'` is opt-in.)*
- In queue mode, when does a queued call's permit start? *(At the moment it actually runs, not when it was queued.)*
- If `fn` fails, is the permit refunded? *(No. The call was made, so it counts.)*
- Do `wrap` and `tryAcquire` share the same budget? *(Yes. One limiter, one window.)*

## Functional requirements
### Part A: `createHitCounter(windowMs, now = Date.now)`
- [ ] `hit()` records one hit at `now()`.
- [ ] `count()` returns the number of hits at times `t` where `now() - t < windowMs`.
- [ ] Any number of hits at the same timestamp are counted correctly.
- [ ] The window rolls continuously: each hit expires on its own schedule, not all at once at a fixed boundary.
- [ ] After a long idle period, `count()` is `0` and new hits count normally.
- [ ] Separate counters don't share state.

### Part B: `createRateLimiter({ limit, windowMs, now = Date.now, onLimit = 'reject' })`
- [ ] Throws a `RangeError` if `limit` is not a positive integer or `windowMs` is not a positive number.
- [ ] `tryAcquire()` returns `true` and records the acquisition at `now()` if fewer than `limit` acquisitions happened at times `t` with `now() - t < windowMs`. Otherwise it returns `false` and records nothing.
- [ ] `wrap(fn)` returns a function with the same parameters that always returns a promise.
- [ ] A wrapped call that gets a permit calls `fn` with all its arguments and settles with `fn`'s result or error. A synchronous throw becomes a rejection. The permit is used either way.
- [ ] **`onLimit: 'reject'`:** over the limit, the call rejects right away, without calling `fn`, with an `Error` whose `name` is `'RateLimitError'` and whose `retryAfterMs` is the number of ms until the oldest acquisition in the window expires.
- [ ] **`onLimit: 'queue'`:** over the limit, the call waits. When a permit frees up, waiting calls run in the order they were made (FIFO), each taking a permit at the moment it runs.
- [ ] In queue mode, a new call made while others are still waiting goes to the back of the queue.
- [ ] `tryAcquire` and wrapped calls use the same window.

## Non-functional requirements
- No libraries.
- **Part A memory:** O(number of distinct timestamps inside the window), never O(number of hits). Expired data is dropped.
- **Part A time:** `hit()` is O(1). `count()` is amortised O(1): expired entries are removed from the front, and the running total is maintained, so nothing re-scans the whole window.
- **Part B:** the log holds at most `limit` timestamps. Queue mode uses at most one pending timer, scheduled for the next expiry. No polling or `setInterval`.
- Deterministic under test: time comes only from `now()` (and `setTimeout` in queue mode).

## Constraints
- 70 minutes.
- Export `createHitCounter` and `createRateLimiter` as named exports from `Solution.ts`. The contract lives in `types.ts`.
- You may export a `RateLimitError` class, but tests only check `name` and `retryAfterMs`.

## Data / API contract
```ts
interface HitCounter {
  hit(): void;
  count(): number;
}

interface RateLimiterOptions {
  limit: number;
  windowMs: number;
  now?: () => number;            // default Date.now
  onLimit?: 'reject' | 'queue';  // default 'reject'
}

interface RateLimiter {
  tryAcquire(): boolean;
  wrap<Args extends unknown[], R>(fn: (...args: Args) => R | PromiseLike<R>): (...args: Args) => Promise<R>;
}

// Rejection value in 'reject' mode
interface RateLimitError extends Error { name: 'RateLimitError'; retryAfterMs: number }

function createHitCounter(windowMs: number, now?: () => number): HitCounter;
function createRateLimiter(options: RateLimiterOptions): RateLimiter;

// Follow-up 1
function createTokenBucket(options: { capacity: number; refillPerSecond: number; now?: () => number }): {
  tryRemove(count?: number): boolean;
  tokens(): number;
};
```

## Test contract
- Tests import `createHitCounter` and `createRateLimiter` as **named exports**.
- Part A and `tryAcquire` tests pass `now: () => clock` and move `clock` by hand.
- `wrap` tests use `vi.useFakeTimers()` with `vi.setSystemTime(0)`, pass `now: () => Date.now()`, and move time with `await vi.advanceTimersByTimeAsync(ms)`. A call that has a permit must reach `fn` by the end of `advanceTimersByTimeAsync(0)`.
- Queue-mode tests check the exact millisecond a queued call reaches `fn`, and the order of calls.
- The error is checked by `name === 'RateLimitError'` and its `retryAfterMs` value.
- Follow-up tests (`npm run test:followups -- s41`) use `createTokenBucket`.

## Edge cases
- `windowMs` of 1: a hit only counts during its own millisecond.
- 100 000 hits at one timestamp, then one hit per ms for a full window.
- `count()` is never called for hours, then called once: cleanup must still be correct (and fast).
- `limit: 1` in queue mode: a strict one-call-per-window pipeline.
- In queue mode, `tryAcquire()` while calls are waiting: should it be allowed to jump the queue? Decide and explain.
- A wrapped `fn` that takes longer than `windowMs` to finish: the limiter limits **starts**, not concurrency.

## Follow-ups
1. **Token bucket.** Add `createTokenBucket({ capacity, refillPerSecond, now })`. It starts full, refills continuously (fractional tokens allowed) up to `capacity`, and `tryRemove(count = 1)` removes tokens only if enough are available. When would you choose it over a sliding-window log, and why does it allow bursts?
2. **Per-key limits.** `createKeyedLimiter({ limit, windowMs })` with `tryAcquire(key)`, for example one limit per user id or per endpoint. Keys that have been idle for longer than the window must be removed, so 1 million distinct keys over a day don't leak memory. How do you clean up without scanning every key on each call?
3. **Honour `Retry-After`.** Wrap `fetch` so that a `429` response with a `Retry-After` header (seconds, or an HTTP date) pauses **all** calls through the limiter until then, and the paused calls are replayed in order. Combine it with your local limit. What should happen to the calls if the user navigates away?
4. **Distributed limiting (discussion).** Ten browser tabs, or 40 servers, share one API quota. Compare a shared counter in Redis (`INCR` + `EXPIRE`, or a sorted-set log), a `BroadcastChannel` leader tab, and splitting the quota locally. What consistency do you give up in each case?

## Concepts covered
Rolling vs fixed windows · deque of (timestamp, count) pairs · amortised cleanup · sliding-window log · FIFO waiting with a single timer · injected clocks for deterministic tests · token bucket refill maths.

Related: J24 throttle(fn, wait) with leading/trailing · S27 Concurrency-limited task runner · S32 retry with backoff · S40 Request batcher / DataLoader.
