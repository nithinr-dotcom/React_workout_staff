# Promise.all / allSettled / any / race

## Problem statement
Implement the four Promise combinators from scratch, **without** calling the native `Promise.all`, `Promise.allSettled`, `Promise.any` or `Promise.race`:

- `promiseAll(values)` fulfils with an array of all results, or rejects as soon as any input rejects.
- `promiseAllSettled(values)` waits for every input and reports how each one settled.
- `promiseAny(values)` fulfils with the first input that fulfils, and only rejects when every input has rejected.
- `promiseRace(values)` settles exactly like the first input to settle, whether that is a fulfilment or a rejection.

Interviewers use this question to see whether you really understand promise resolution, ordering and edge cases. "It works for my three-promise example" is not the bar; matching the spec is.

## Clarifying questions to ask
- Can the input contain plain values or thenables instead of promises? *(Yes. Treat every element the way `Promise.resolve` would.)*
- Is the input always an array? *(No. Any iterable: arrays, `Set`s, generators.)*
- Does the result order follow input order or completion order? *(Input order, always.)*
- What happens with an empty input? *(Match the spec. See the functional requirements.)*
- When `promiseAll` rejects, should we cancel the other inputs? *(Promises can't be cancelled. The others keep running; their results are ignored.)*
- Can we use `async`/`await`? *(Yes, but don't delegate to the native combinators.)*

## Functional requirements
- [ ] Every function returns a real `Promise` (`instanceof Promise`), even when all inputs are plain values. The result is never available synchronously.
- [ ] Every function accepts **any iterable** and treats each element like `Promise.resolve(element)` would: plain values, native promises and thenables all work.
- [ ] None of the functions throws synchronously. If iterating the input throws, the returned promise rejects with that error.
- [ ] **`promiseAll`**
  - [ ] Fulfils with the values **in input order**, regardless of the order the inputs settle in.
  - [ ] Rejects with the reason of the **first** input to reject, without waiting for the rest.
  - [ ] An empty iterable fulfils with `[]`.
- [ ] **`promiseAllSettled`**
  - [ ] Fulfils with `{ status: 'fulfilled', value }` or `{ status: 'rejected', reason }` per input, in input order.
  - [ ] Never rejects because of an input. An empty iterable fulfils with `[]`.
- [ ] **`promiseAny`**
  - [ ] Fulfils with the value of the first input to **fulfil**, ignoring rejections that happened before it.
  - [ ] If every input rejects, rejects with an `AggregateError` whose `errors` array holds the reasons **in input order** (not rejection order).
  - [ ] An empty iterable rejects with an `AggregateError` whose `errors` is `[]`.
- [ ] **`promiseRace`**
  - [ ] Settles with the outcome of the first input to settle, fulfilled or rejected.
  - [ ] An empty iterable returns a promise that **stays pending forever**.
- [ ] Do not call `Promise.all`, `Promise.allSettled`, `Promise.any` or `Promise.race` anywhere in your code.

## Non-functional requirements
- No libraries.
- **Performance:** each input is subscribed to exactly once. No polling, no timers.
- **Memory:** don't keep references around after the returned promise has settled longer than necessary.
- **Types:** keep the signatures from `types.ts`. `promiseAll([1, Promise.resolve('a')])` should type-check.

## Constraints
- 50 minutes.
- Export `promiseAll`, `promiseAllSettled`, `promiseAny` and `promiseRace` as named exports from `Solution.ts`.
- `Promise.resolve`, `Promise.reject`, `new Promise` and `AggregateError` are allowed.

## Data / API contract
```ts
type MaybePromise<T> = T | PromiseLike<T>;

function promiseAll<T>(values: Iterable<MaybePromise<T>>): Promise<Awaited<T>[]>;
function promiseAllSettled<T>(values: Iterable<MaybePromise<T>>): Promise<PromiseSettledResult<Awaited<T>>[]>;
function promiseAny<T>(values: Iterable<MaybePromise<T>>): Promise<Awaited<T>>;
function promiseRace<T>(values: Iterable<MaybePromise<T>>): Promise<Awaited<T>>;

// Follow-ups
function promiseProps<T extends Record<string, unknown>>(object: T): Promise<{ [K in keyof T]: Awaited<T[K]> }>;
function promisify<Args extends unknown[], R>(
  fn: (...args: [...Args, (error: unknown, result?: R) => void]) => void,
): (...args: Args) => Promise<R>;
```

## Test contract
- Tests import the four functions as **named exports** of the module.
- They control settle order with hand-made deferred promises and wait for microtasks with `await new Promise((r) => setTimeout(r, 0))`.
- "Stays pending" is checked by racing the result against a sentinel after the microtask queue has drained.
- One test spies on `Promise.all`, `Promise.allSettled`, `Promise.any` and `Promise.race` and expects none of them to be called.
- Follow-up tests (`npm run test:followups -- s26`) use the named exports `promiseProps` and `promisify`.

## Edge cases
- Inputs that settle in reverse order.
- The same promise appearing twice in the input.
- An input that rejects **after** `promiseAll` has already rejected must not cause an unhandled rejection or a second settle.
- A thenable that calls both `resolve` and `reject`, or calls `resolve` twice. Only the first call counts.
- A generator that throws halfway through.
- `promiseAny` where some inputs reject before one fulfils.
- A sparse or very large array (100k items): no recursion and no O(n²) work.

## Follow-ups
1. **`promiseProps`.** Implement `promiseProps({ user: fetchUser(), posts: fetchPosts() })`, which fulfils with an object that has the same keys and the resolved values. Rejects like `promiseAll`. Reuse your own code instead of duplicating it.
2. **`promisify`.** Implement `promisify(fn)` for Node-style APIs where the last argument is `(err, result) => void`. The wrapper forwards `this` and all arguments, rejects when `err` is not `null`/`undefined`, and fulfils with `result` otherwise.
3. **Tuple types.** Make `promiseAll([fetchUser(), fetchCount()] as const)` infer `Promise<[User, number]>` instead of `Promise<(User | number)[]>`. How does `lib.es2015.promise.d.ts` do it?
4. **Microtask timing.** Explain why `promiseAll([])` must still be asynchronous, and why checking `value instanceof Promise` instead of calling `Promise.resolve(value)` is a bug (hint: thenables and cross-realm promises).
5. **Cancellation.** The native combinators can't cancel losing inputs. Design a `raceWithAbort(tasks: ((signal) => Promise<T>)[])` that aborts the losers. What does the API look like, and who owns the `AbortController`?

## Concepts covered
The promise resolution procedure · microtasks vs macrotasks · iterables and generators · `AggregateError` · fail-fast vs settle-all aggregation · preserving order under concurrency.

Related: S27 Concurrency-limited task runner · S32 retry with backoff · S33 useFetch.
