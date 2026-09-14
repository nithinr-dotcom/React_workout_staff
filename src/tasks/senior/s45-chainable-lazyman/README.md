# Chainable APIs: LazyMan & fluent query builder

## Problem statement
jQuery, Knex, Cypress, supertest and most SDKs share one API style: methods that return something you can keep chaining. This task covers the two ways that style gets asked in interviews.

**Part A: LazyMan (BFE #130).** `LazyMan('Jack', log)` returns an object whose methods only *queue* work. The queue starts running on its own, after the synchronous chain has finished:

```ts
LazyMan('Jack', console.log).eat('banana').sleep(10).eat('apple').sleepFirst(5);
// (after 5 seconds)
// Wake up after 5 seconds.
// Hi, I'm Jack.
// Eat banana.
// (after 10 seconds)
// Wake up after 10 seconds.
// Eat apple.
```

**Part B: a fluent, fetch-based API client**, a question Atlassian has asked:

```ts
const client = createApiClient(fetch, { baseUrl: 'https://api.example.com' });
const users = await client.get('/users').query({ page: 2 }).header('x-trace', 'abc').retry(2);
```

Two properties make it interesting. Builders are **immutable**, so you can keep a base request and branch from it safely. And the builder is **thenable**, so `await builder` sends the request without an explicit `.send()`.

## Clarifying questions to ask
- When does the LazyMan queue start? *(Asynchronously, after the current synchronous code. Nothing is logged during the chain itself.)*
- Is `sleep` in seconds or milliseconds? *(Seconds, as in BFE.)*
- What exactly is logged? *(`Hi, I'm <name>.`, `Eat <food>.` and `Wake up after <n> seconds.`, with `second` singular when `n === 1`. The wake-up message is logged when the sleep ends.)*
- Where does `sleepFirst` go if it's called several times? *(All `sleepFirst` tasks run before the greeting, in the order they were called.)*
- Can the chain be extended later, for example `.eat()` inside a `setTimeout` after the queue has started? *(Out of scope. All calls happen in one synchronous chain.)*
- What does `send()` resolve with? *(The parsed JSON body, from `response.json()`.)*
- What counts as a failure, and what is retried? *(A rejected `fetchImpl` call (network error) or a response with `status >= 500` is retried. A 4xx response rejects right away. Any non-ok response rejects with an `Error` that has a numeric `status`.)*
- Is there a delay between retries? *(No. Backoff is S32.)*
- Does awaiting the same builder twice send two requests? *(Yes. A builder is a description of a request, not a cached result.)*

## Functional requirements
### Part A: LazyMan
- [ ] `LazyMan(name, log)` returns an object with `eat`, `sleep` and `sleepFirst`. Each method returns an object you can keep chaining.
- [ ] No message is logged synchronously. The queue starts after the synchronous chain.
- [ ] The first normal task is the greeting `Hi, I'm <name>.`.
- [ ] `eat(food)` logs `Eat <food>.` when its turn comes.
- [ ] `sleep(n)` waits `n` seconds, logs `Wake up after <n> second(s).`, then lets the next task run.
- [ ] `sleepFirst(n)` behaves like `sleep`, but runs before the greeting and every other normal task, no matter where it appears in the chain. Several `sleepFirst` calls keep their relative order.
- [ ] Separate `LazyMan` instances have separate queues and run concurrently.

### Part B: API client
- [ ] `createApiClient(fetchImpl, { baseUrl })` returns a client with `get(path)` and `post(path, body)`.
- [ ] Every builder method (`query`, `header`, `retry`) returns a **new** builder. The original is never modified.
- [ ] `query(params)` merges into the existing query; later keys overwrite earlier ones. Values are converted to strings and URL-encoded.
- [ ] `header(name, value)` adds or overwrites a header.
- [ ] `send()` calls `fetchImpl(url, { method, headers, body })` once per attempt, where `url` is `baseUrl + path + '?' + query` (no `?` when the query is empty).
- [ ] `post` sends `JSON.stringify(body)` with a `Content-Type: application/json` header, unless one was set explicitly.
- [ ] `send()` resolves with `await response.json()` when `response.ok` is true.
- [ ] A non-ok response rejects with an `Error` that has `status`. A 4xx is never retried.
- [ ] `retry(n)` allows up to `n` extra attempts after network errors and 5xx responses. When they run out, reject with the last error.
- [ ] Builders are **thenable**: `await builder` (or `builder.then(...)`) behaves exactly like `builder.send()`. Nothing is sent before `send()` or `then()` is called.

## Non-functional requirements
- No libraries. Don't use the global `fetch`; only the injected `fetchImpl`.
- **Immutability without deep copies of everything:** copying small `query` and `headers` objects per call is fine. Explain the cost if a builder had 10,000 chained calls.
- **Types:** `client.get<User[]>('/users')` makes `await` produce `User[]`. Keep the signatures in `types.ts`.

## Constraints
- 70 minutes.
- Export `LazyMan` and `createApiClient` as named exports from `Solution.ts`. `LazyMan` is called without `new`.
- Use `setTimeout` for LazyMan's sleeps; tests use fake timers.

## Data / API contract
```ts
interface ILazyMan {
  eat(food: string): ILazyMan;
  sleep(seconds: number): ILazyMan;
  sleepFirst(seconds: number): ILazyMan;
}
function LazyMan(name: string, log: (message: string) => void): ILazyMan;

interface ResponseLike { ok: boolean; status: number; json(): Promise<unknown> }
interface RequestInitLike { method: string; headers: Record<string, string>; body?: string; signal?: AbortSignal }
type FetchLike = (url: string, init: RequestInitLike) => Promise<ResponseLike>;
interface HttpError extends Error { status: number }

interface RequestBuilder<T = unknown> extends PromiseLike<T> {
  query(params: Record<string, string | number | boolean>): RequestBuilder<T>;
  header(name: string, value: string): RequestBuilder<T>;
  retry(times: number): RequestBuilder<T>;
  timeout(ms: number): RequestBuilder<T>; // follow-up 1
  send(): Promise<T>;
}
interface ApiClient {
  get<T = unknown>(path: string): RequestBuilder<T>;
  post<T = unknown>(path: string, body: unknown): RequestBuilder<T>;
}
function createApiClient(fetchImpl: FetchLike, options?: { baseUrl?: string }): ApiClient;
```

## Test contract
- Tests import `LazyMan` and `createApiClient` as **named exports**.
- **Part A** uses `vi.useFakeTimers()` and `await vi.advanceTimersByTimeAsync(ms)`, and checks the exact messages passed to `log`. Starting the queue on a microtask or on `setTimeout(…, 0)` are both fine.
- **Part B** passes a `vi.fn` fake fetch that returns `{ ok, status, json }` objects or rejects with a `TypeError`. Requests are inspected by parsing the URL with `new URL(url)` (so query parameter order doesn't matter), reading headers with `new Headers(init.headers)` (so name case doesn't matter), and `JSON.parse(init.body)`.
- The method is compared in upper case.
- Follow-up tests (`npm run test:followups -- s45`) call `.timeout(ms)` with fake timers, check that `init.signal` aborts after `ms`, and expect a rejection whose `name` is `'TimeoutError'`, even though the fake fetch ignores the signal.

## Edge cases
- `sleep(0)` still lets the next task wait for a timer turn, but logs `Wake up after 0 seconds.`.
- A chain with only `sleepFirst`: the greeting still runs afterwards.
- `query({})` and a path that already contains `?`. *(Not tested; decide how to join them.)*
- `header('X-Token', 'a').header('x-token', 'b')`: HTTP header names are case-insensitive. Which value should win?
- `retry(0)`: one attempt only.
- A response whose `json()` rejects (invalid JSON): don't retry it; reject with that error.
- Calling `then` without handlers, or passing a builder to `Promise.resolve`, which calls `then` for you.

## Follow-ups
1. **Timeouts.** Add `.timeout(ms)`. Each attempt passes an `AbortSignal` to `fetchImpl` that aborts after `ms`, and the request rejects with an error named `TimeoutError`, even if `fetchImpl` ignores the signal. A timed-out attempt counts as retryable. Clear the timer when the attempt settles.
2. **Interceptors.** Atlassian-style follow-up: add `client.use(interceptor)`, where interceptors can change the request (add an auth header) and see the response. On a 401, refresh the token once and replay the request. How do you stop five parallel requests from all refreshing at the same time?
3. **LazyMan with async tasks.** Add `.do(fn)`, where `fn` may return a promise, and the queue waits for it. Then add `.cancel()`, which stops the rest of the queue. What does the queue look like now, and is it any different from S43's `runInSequence`?
4. **Type-state builders.** Use TypeScript so `.body()` exists only on POST/PUT builders, and `.send()` is only available once a required header has been set. What does that do to the thenable?
5. **The thenable trap.** Returning a builder from an `async` function, or passing it to `Promise.resolve`, sends the request because `then` gets called for you. Why did some libraries (for example Knex) keep thenables, and why do others make `.send()` or `.exec()` mandatory?

## Concepts covered
Method chaining and returning `this` vs new objects · task queues with deferred start · macrotasks vs microtasks · immutable builders and structural sharing · the thenable protocol (`PromiseLike`) · retry policies by error class · dependency injection of `fetch` for testability.

Related: S43 Async flow control · S32 retry with backoff · S27 Concurrency runner · S33 useFetch.
