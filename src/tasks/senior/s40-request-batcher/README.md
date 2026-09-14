# Request batcher / DataLoader

## Problem statement
A feed renders 40 posts, and each post renders its author by calling `getUser(id)`. That's 40 requests, even though your API has a batch endpoint `POST /users/batch { ids: [...] }` that could answer all of them in one round trip.

Build `createBatcher(batchFn, { maxBatchSize, maxWaitMs })`. It returns a `load(key)` function that looks like a single fetch to its callers. Behind the scenes it collects keys for a short window and sends them together:

```ts
const users = createBatcher((ids: number[]) => api.getUsersBatch(ids), { maxBatchSize: 50, maxWaitMs: 10 });
const ada = await users.load(1); // one request for every load() made in the same 10ms window
```

This is the core of Facebook's DataLoader, and of every analytics SDK that queues events. Uber asks this pattern, together with "merge identical API calls". The interviewer wants to see a correct flush trigger (size **or** time), deduplication, and error handling per key, so one bad id doesn't fail the whole page.

## Clarifying questions to ask
- When does the window start? *(When the first key of a new batch is queued. It is not reset by later keys, so it isn't a debounce.)*
- What does `batchFn` return? *(A promise of an array with one result per key, in the same order as the keys it received.)*
- How is a failure for one key reported? *(That position in the array holds an `Error` instance. Only that key rejects.)*
- What if `batchFn` returns fewer results than keys? *(Keys without a result reject with an `Error`. The others still resolve.)*
- What if the same key is loaded twice in one window? *(It is sent once, and both callers get the same outcome.)*
- Do results get cached across batches? *(Not in the base version. Loading the same key in a later window sends it again. Caching is follow-up 3.)*
- How are keys compared? *(Like `Map` keys: SameValueZero. Object keys are compared by identity.)*

## Functional requirements
- [ ] `createBatcher(batchFn, options)` returns an object with `load(key)`. Nothing is sent until a key is loaded.
- [ ] `load(key)` returns a promise for that key's value.
- [ ] All keys loaded within `maxWaitMs` of the first key of a batch are sent in **one** `batchFn` call, when that window ends.
- [ ] `maxWaitMs` defaults to `0`: keys loaded in the same synchronous run are batched, and the flush happens on a zero-delay timer.
- [ ] When a batch reaches `maxBatchSize` unique keys, it is sent **right away**, without waiting for the timer. The next `load` starts a new batch with a fresh window.
- [ ] `maxBatchSize` defaults to `Infinity`.
- [ ] `batchFn` receives each key **once** per batch, in the order the keys were first loaded.
- [ ] Result `i` belongs to key `i`. Each caller's promise resolves with its key's result. Duplicate callers of the same key all get it.
- [ ] If result `i` is an `Error` instance, only the callers of key `i` reject, with that error.
- [ ] If the results array is shorter than the keys array, each key without a result rejects with an `Error`. The other keys resolve normally.
- [ ] If `batchFn` rejects, or throws synchronously, every caller in that batch rejects with that error.
- [ ] Once a batch has been sent, it is closed. New `load` calls go into a new batch, even while the old one is still in flight.
- [ ] Separate batchers don't share queues.

## Non-functional requirements
- No libraries. `setTimeout` and `clearTimeout` for the window.
- At most one pending window timer per batcher. Flushing on size cancels the window timer, so it can't fire later and flush the next batch early.
- O(1) work per `load` call (Map lookup for dedupe), plus O(n) per flush.
- No unhandled promise rejections, including for batches whose `batchFn` rejects.
- Fully typed: `createBatcher<number, User>(...)` makes `load(1)` a `Promise<User>`.

## Constraints
- 60 minutes.
- Export `createBatcher` as a named export from `Solution.ts`. The contract lives in `types.ts`.
- The mock API has no batch endpoint. Tests pass a `vi.fn` as `batchFn`, and the Playground fakes one.

## Data / API contract
```ts
type BatchFn<K, V> = (keys: K[]) => Promise<(V | Error)[]>;

interface BatcherOptions {
  maxBatchSize?: number; // default Infinity
  maxWaitMs?: number;    // default 0
  cache?: boolean;       // follow-up 3, default false
}

interface Batcher<K, V> {
  load(key: K): Promise<V>;
  loadMany(keys: K[]): Promise<(V | Error)[]>; // follow-up 1
  prime(key: K, value: V): void;               // follow-up 3
  clear(key: K): void;                         // follow-up 3
  clearAll(): void;                            // follow-up 3
}

function createBatcher<K, V>(batchFn: BatchFn<K, V>, options?: BatcherOptions): Batcher<K, V>;
```

## Test contract
- Tests import `createBatcher` as a **named export**.
- Tests use `vi.useFakeTimers()` and `await vi.advanceTimersByTimeAsync(ms)`, checking `batchFn` calls just before and exactly at `maxWaitMs`.
- A size-triggered flush is expected after `await vi.advanceTimersByTimeAsync(0)` at the latest. Flushing synchronously inside `load` is also fine.
- `batchFn` is a `vi.fn`. Tests read the keys it was called with, and sometimes return hand-made deferred promises from it.
- Rejections are checked by identity for errors returned or thrown by `batchFn`, and with `toBeInstanceOf(Error)` for missing results.
- Follow-up tests (`npm run test:followups -- s40`) use `loadMany` (follow-up 1) and `cache: true` with `prime`, `clear` and `clearAll` (follow-up 3).

## Edge cases
- `batchFn` resolves with something that isn't an array: reject every key in the batch with a `TypeError`.
- `batchFn` returns **more** results than keys: ignore the extras.
- A result that is `undefined` (not missing, just `undefined`) is a valid value.
- `load` called from inside a `.then` of an earlier load: it belongs to whichever batch is open at that moment.
- `maxBatchSize: 1`: every key is sent on its own, immediately.
- Duplicate keys don't count twice towards `maxBatchSize`.

## Follow-ups
1. **`loadMany(keys)`.** Resolves with an array holding each key's value or `Error`, in order, like DataLoader. It never rejects because of a per-key failure. Keys go through the same batching, so `loadMany([1, 2])` and `load(3)` in the same window make one call.
2. **Microtask batching.** DataLoader doesn't use a timer. It collects every `load` made in the current tick, then flushes on a microtask (after the promise jobs already queued). Add `maxWaitMs: 'microtask'` (or a `scheduler` option) and explain the trade-off. Why does React rendering 40 components in one commit fit this model so well?
3. **Caching, priming and clearing.** With `cache: true`, remember each key's promise across batches: a later `load` of the same key doesn't call `batchFn` again. Failed keys are **not** cached. `prime(key, value)` seeds the cache if the key isn't cached yet. `clear(key)` and `clearAll()` forget results, for example after a mutation. What goes wrong if one cache is shared between requests for different users on a server?
4. **Analytics sender (Uber).** Change the shape: `track(event)` returns nothing, events are sent in batches of up to N or every T ms, and a failed batch is retried with backoff (S32) without reordering events or losing events tracked during the retry. On `pagehide`, flush what's left with `navigator.sendBeacon`. What's the maximum payload and how do you split?

## Concepts covered
DataLoader-style batching · flush on size or time · one promise per caller fanned out from one request · dedupe with a `Map` · per-key vs whole-batch failures · timer lifecycle and cancellation.

Related: S27 Concurrency-limited task runner · S39 Async memoize with in-flight dedupe · S32 retry with backoff · S26 Promise combinators.
