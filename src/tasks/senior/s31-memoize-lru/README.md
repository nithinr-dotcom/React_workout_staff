# memoize & LRU cache

## Problem statement
Build two pieces that work together.

1. **`LRUCache`**, a class with a fixed capacity. When it is full and a new key is added, the **least recently used** entry is evicted. All operations are O(1).
2. **`memoize(fn, options)`**, which caches the results of `fn`. It supports a custom cache key, a maximum size (backed by your `LRUCache`), a time-to-live, and correct behaviour for async functions: concurrent calls with the same key share one in-flight promise, and a rejected promise is not cached.

This is the kind of utility that sits under a data-fetching layer, a selector library or an image cache. The interviewer will push on the details: what counts as "use", what happens on update, and what happens when a cached promise fails.

## Clarifying questions to ask
- Does `has` count as a use? *(No. Only `get` hits and `put` refresh recency.)*
- Does updating an existing key evict anything? *(No. It updates the value and makes the key most recently used.)*
- Is `onEvict` called for `delete` and `clear`? *(No, only for capacity evictions.)*
- What's a valid capacity? *(A positive integer. Anything else throws a `RangeError`.)*
- What's the default memoize key? *(The first argument, compared like `Map` keys (SameValueZero), as lodash does. Use `resolver` for multi-argument functions.)*
- Should `undefined` results be cached? *(Yes. A cached `undefined` is still a hit.)*
- What if `fn` throws synchronously? *(Nothing is cached and the error propagates.)*
- What is TTL measured from? *(The moment the value was stored, using `Date.now()`.)*

## Functional requirements
### LRUCache
- [ ] `new LRUCache(capacity, { onEvict })`. Throws `RangeError` if `capacity` is not a positive integer.
- [ ] `get(key)` returns the value and marks the key most recently used; returns `undefined` on a miss.
- [ ] `put(key, value)` inserts or updates and marks the key most recently used.
- [ ] Inserting a new key when `size === capacity` evicts the least recently used entry and calls `onEvict(key, value)` for it.
- [ ] `has(key)` returns presence without changing recency.
- [ ] `delete(key)` removes the entry and returns `true`, or returns `false` if it wasn't there.
- [ ] `clear()` removes everything.
- [ ] `size` is a read-only property with the current entry count.
- [ ] `keys()` returns keys from least recently used to most recently used.
- [ ] Every operation except `keys()` is O(1).

### memoize
- [ ] `memoize(fn)` returns a function with the same parameters and return type that calls `fn` at most once per key while the entry is cached.
- [ ] The key is `resolver(...args)` when given, otherwise the first argument.
- [ ] The memoized function forwards all arguments and its `this` to `fn`.
- [ ] Results are cached even when they are `undefined`, `null`, `0` or `false`.
- [ ] With `maxSize`, at most that many entries are kept; the least recently used is evicted.
- [ ] With `ttl`, an entry older than `ttl` ms is treated as missing and recomputed on the next call.
- [ ] If `fn` throws, nothing is cached and the error is rethrown.
- [ ] If `fn` returns a promise, the promise itself is cached, so concurrent calls with the same key get the **same** promise and `fn` runs once.
- [ ] If that promise rejects, its entry is removed so the next call retries. Removing it must not clobber a newer entry stored under the same key.
- [ ] `memoized.clear()` empties the cache.

## Non-functional requirements
- No libraries. Use `Map` iteration order; a hand-rolled doubly linked list is acceptable but not needed.
- `LRUCache` operations are O(1); memoize adds O(1) per call on top of `resolver`.
- No timers for TTL: expiry is checked lazily on access, so an idle cache has no pending timers.
- Fully typed: the memoized function has the same signature as `fn`.

## Constraints
- 60 minutes.
- Export `LRUCache` (a class) and `memoize` as named exports from `Solution.ts`. The contract lives in `types.ts`.
- `memoize` with `maxSize` should reuse your `LRUCache`.

## Data / API contract
```ts
interface LRUCacheOptions<K, V> { onEvict?: (key: K, value: V) => void }

interface LRUCacheLike<K, V> {
  get(key: K): V | undefined;
  put(key: K, value: V): void;
  has(key: K): boolean;
  delete(key: K): boolean;
  clear(): void;
  readonly size: number;
  keys(): K[]; // least → most recently used
}

class LRUCache<K, V> implements LRUCacheLike<K, V> {
  constructor(capacity: number, options?: LRUCacheOptions<K, V>);
}

interface MemoizeOptions<Args extends unknown[]> {
  resolver?: (...args: Args) => unknown; // default: first argument
  maxSize?: number;                      // default: unbounded
  ttl?: number;                          // ms, measured with Date.now()
}

interface Memoized<Args extends unknown[], R> {
  (...args: Args): R;
  clear(): void;
}

function memoize<Args extends unknown[], R>(fn: (...args: Args) => R, options?: MemoizeOptions<Args>): Memoized<Args, R>;
```

## Test contract
- Tests construct `new LRUCache(capacity, options)` and call `memoize` as named exports of the module.
- Recency is observed through `keys()` and through which key `onEvict` reports.
- TTL tests use `vi.useFakeTimers()` and `vi.advanceTimersByTime(ms)`, which also moves `Date.now()`. An entry stored at time `t` with `ttl: 1000` is still fresh at `t + 999` and expired at `t + 1000`.
- Promise tests use deferred promises and compare returned promises with `toBe`.

## Edge cases
- `capacity = 1`: every new key evicts the previous one.
- `put` on an existing key in a full cache must not evict anything.
- `get` of a key whose stored value is `undefined`: from `LRUCache` you can't tell a hit from a miss, so memoize must use `has`.
- A promise that rejects **after** `clear()` and a new call have already replaced its entry.
- `resolver` returning objects: two equal-looking objects are different keys. How would you key by several arguments?
- `NaN` as a key: `Map` treats `NaN` as equal to itself.

## Follow-ups
1. **Multi-argument keys without stringifying.** Key by every argument by identity using a nested `Map` / `WeakMap` trie, so object arguments can be garbage collected. What does `JSON.stringify(args)` get wrong?
2. **Stale-while-revalidate.** Add `staleWhileRevalidate: true`: an expired entry is returned immediately while a background refresh runs, and concurrent callers share that refresh.
3. **Stats.** Expose `memoized.stats()` returning `{ hits, misses, evictions }`, and document which of them a TTL expiry counts as.
4. **Size by weight.** Let `LRUCache` accept `maxWeight` and a `weigh(value)` function (for example bytes for image blobs), evicting until the total fits.
5. **React.** Compare `useMemo`, a module-level `memoize`, and `React.cache`. Which one is safe to use for per-request data on the server, and why?

## Concepts covered
`Map` insertion order as an O(1) recency list · getters on classes · cache key design · lazy TTL expiry · caching promises vs caching values · identity checks to avoid clobbering newer entries.

Related: S26 Promise combinators · S27 Concurrency-limited task runner · S33 useFetch with abort + cache.
