# Async memoize with in-flight dedupe

## Problem statement
A product page renders six widgets. Each one calls `getUser({ id: 7, fields: ['name'] })`, and some of them build that argument object with the keys in a different order. Without help, that is six identical network requests, and a seventh one when the user navigates back.

Write `memoizeAsync(fn, options)` for functions that return a promise:
- Identical calls made **while a request is in flight** share that one request.
- A fulfilled result is cached, optionally for a limited time (`ttl`).
- A failure is never cached, so the next call tries again.
- Arguments that are *equal* hit the same entry even when they aren't the *same object*, so `{ a: 1, b: 2 }` and `{ b: 2, a: 1 }` match.
- `clear()` and `delete(...args)` invalidate entries without corrupting callers that are still waiting.

Uber asked this in 2025, including a callback-style version. Rippling, Microsoft and Atlassian ask variants of it. S31 was a general `memoize` keyed by identity. This task is about the async lifecycle of one cache entry, and about the race conditions around invalidating it.

## Clarifying questions to ask
- What can the arguments be? *(JSON-like data: primitives, arrays and plain objects, nested to any depth. Functions, `Map`s and class instances are out of scope for the default key.)*
- Does key order inside objects matter? *(No. `{ a: 1, b: 2 }` and `{ b: 2, a: 1 }` are the same key, at any depth. Array order **does** matter.)*
- Are `1` and `'1'` the same argument? *(No. They must produce different keys.)*
- When does the TTL start: at the call or when the promise fulfils? *(When it fulfils. A slow request shouldn't arrive already expired.)*
- If a call is in flight and the TTL is short, can a second caller start a duplicate request? *(No. An in-flight entry never expires. TTL only applies to fulfilled values.)*
- What happens to callers already waiting when someone calls `clear()`? *(They still get their result. But that result must not be written back into the cache.)*
- Can `fn` throw synchronously? *(Yes. The memoized function still returns a rejected promise, never throws, and caches nothing.)*
- Should `this` be forwarded? *(Not required.)*

## Functional requirements
- [ ] `memoizeAsync(fn, options)` returns a function that takes the same arguments as `fn` and **always returns a promise**.
- [ ] The first call for a key calls `fn` with **all** the arguments.
- [ ] While that call is in flight, further calls with the same key do not call `fn` again. They settle with the same value or the same error.
- [ ] Once the promise fulfils, calls with the same key resolve with the cached value without calling `fn`.
- [ ] If the promise rejects, every waiting caller rejects with that error and the entry is removed, so the next call calls `fn` again.
- [ ] If `fn` throws synchronously, the call returns a promise that rejects with that error, and nothing is cached.
- [ ] **Default key:** derived from all arguments. Object keys are compared regardless of order, at any depth. Array order matters. Values of different types (`1` vs `'1'`, `null` vs `'null'`) never collide.
- [ ] **`options.key(...args)`** replaces the default key. It returns a string.
- [ ] **`options.ttl`** (ms, default `Infinity`): a value that fulfilled at time `t` is served from the cache while `now() - t < ttl`. From `t + ttl` onwards the next call calls `fn` again.
- [ ] **`options.now`** (default `Date.now`) is the only clock used.
- [ ] `memoized.delete(...args)` removes the entry for those arguments, using the same key logic as a call, and returns whether an entry existed.
- [ ] `memoized.clear()` removes every entry.
- [ ] After `delete` or `clear`, a request that was in flight still settles for the callers that were waiting on it, but it does **not** repopulate the cache. It must not overwrite or remove a newer entry for the same key either.
- [ ] Separate memoized functions don't share a cache.

## Non-functional requirements
- No libraries.
- No timers. Expiry is checked lazily when a key is accessed.
- O(size of the arguments) per call for the default key. O(1) cache operations after that.
- No unhandled promise rejections from the cache's own internal bookkeeping.
- Fully typed: `memoizeAsync(getUser)` has the same parameters as `getUser` and returns `Promise<User>`.

## Constraints
- 60 minutes.
- Export `memoizeAsync` as a named export from `Solution.ts`. The contract lives in `types.ts`.
- Don't import your S31 solution. Write the cache inline (a `Map` is enough).

## Data / API contract
```ts
interface MemoizeAsyncOptions<Args extends unknown[]> {
  ttl?: number;                      // ms from fulfilment, default Infinity
  key?: (...args: Args) => string;   // default: stable serialisation of all args
  now?: () => number;                // default Date.now
  maxSize?: number;                  // follow-up 2
}

interface MemoizedAsync<Args extends unknown[], R> {
  (...args: Args): Promise<R>;
  clear(): void;
  delete(...args: Args): boolean;
}

function memoizeAsync<Args extends unknown[], R>(
  fn: (...args: Args) => Promise<R>,
  options?: MemoizeAsyncOptions<Args>,
): MemoizedAsync<Args, R>;

// Follow-up 1
type NodeCallback<R> = (error: unknown, result?: R) => void;
function memoizeCallback<Args extends unknown[], R>(
  fn: (...args: [...Args, NodeCallback<R>]) => void,
  options?: MemoizeAsyncOptions<Args>,
): (...args: [...Args, NodeCallback<R>]) => void;
```

## Test contract
- Tests import `memoizeAsync` as a **named export**.
- `fn` is a `vi.fn` that returns hand-made deferred promises, so tests decide when each request settles. Call counts on `fn` are the main assertion.
- Tests wait for settling with `await` on the returned promises, or `await new Promise((r) => setTimeout(r, 0))`.
- TTL tests pass `now: () => clock` and change `clock` by hand. No fake timers.
- Tests don't compare returned promises by identity. Wrapping the shared promise per caller is fine.
- Follow-up tests (`npm run test:followups -- s39`) use `memoizeCallback` (follow-up 1) and the `maxSize` option (follow-up 2).

## Edge cases
- No arguments at all: `memoized()` is one key.
- `ttl: 0`: nothing is served from the cache after fulfilment, but concurrent in-flight calls are still shared.
- A call with the same key **after** a rejection but while other callers are still handling that rejection.
- `delete` during flight, followed by a new call: two requests are in flight for the same key, and only the newer one may end up cached, whichever finishes first.
- `undefined` inside arrays or objects: the default key may treat it like `null` or drop it. Decide, and say which.
- A resolved value of `undefined` is still a cached value.

## Follow-ups
1. **Callback-style functions (Uber).** Add `memoizeCallback(fn)` for functions whose last argument is a Node-style callback `(err, result) => void`. Concurrent calls with the same key call `fn` once, and every caller's callback gets the result. Errors are passed to every waiting callback and are not cached. Callbacks are called asynchronously, even on a cache hit. Can you build it on `memoizeAsync` without duplicating logic?
2. **Maximum size.** Add `maxSize`. When a new key would exceed it, evict the least recently used entry, where a cache hit counts as a use. Evicting an in-flight entry must not break the callers that are waiting on it. Reuse the idea from S31.
3. **Abort only when everyone aborts.** Let callers pass an `AbortSignal`, and pass a combined signal to `fn`. The shared request is aborted only when **every** caller waiting on it has aborted. A caller that aborts gets an `AbortError` right away, while the others keep waiting. What happens when a new caller joins a request whose earlier callers have all aborted?
4. **Negative caching.** Some errors are worth caching briefly: a `404` won't fix itself in 200 ms, but a `503` might. Add `shouldCacheError(error)` and `errorTtl`. How does this interact with retries (S32)?

## Concepts covered
Caching the promise instead of the value · entry lifecycle (in flight → fulfilled → expired) · canonical keys for order-insensitive objects · TTL from an injected clock · identity checks so stale settles can't overwrite newer entries · invalidation during flight.

Related: S31 memoize & LRU cache · S32 retry with backoff · S33 useFetch with abort + cache · ST06 Mini React Query.
