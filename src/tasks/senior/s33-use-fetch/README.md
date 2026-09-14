# useFetch with abort + cache

## Problem statement
Write a `useFetch(key, fetcher, options)` hook that a product team could use instead of hand-rolling `useEffect` + `fetch` in every component.

The hook calls `fetcher(key, signal)` and exposes `{ data, error, status, isValidating, refetch }`. It must be correct under the conditions that break naive implementations:

- the key changes while a request is in flight,
- the component unmounts before the response arrives,
- several components ask for the same key at the same time,
- a component mounts for a key that was already fetched earlier.

Cached data is shown **immediately** and then revalidated in the background (stale-while-revalidate, like SWR or React Query). Identical in-flight requests are shared, not duplicated.

Also export `clearCache()`, which empties the shared cache.

## Clarifying questions to ask
- Where does the cache live? *(In module scope, shared by every component using the hook. No provider.)*
- Does the cache expire? *(No. Every mount or key change revalidates, so entries are never trusted blindly. TTL is a follow-up.)*
- Are errors cached? *(No. Only successful data is cached.)*
- If the fetcher function identity changes on every render (an inline arrow), should that refetch? *(No. Only `key`, `enabled` and `refetch()` trigger requests. The latest fetcher is used for the next request.)*
- If two components share an in-flight request and one unmounts, is the request aborted? *(No. It is aborted only when no component is waiting for it any more.)*
- Does it need to support Suspense? *(No.)*

## Functional requirements
- [ ] On mount with `enabled` (default `true`), call `fetcher(key, signal)` once. `status` is `'loading'` and `data` is `undefined` until it settles.
- [ ] On success: `status` is `'success'`, `data` is the resolved value, `error` is `undefined`, `isValidating` is `false`.
- [ ] On failure: `status` is `'error'` and `error` is the rejection reason. `data` keeps any previously known data for this key (it is not cleared).
- [ ] `enabled: false`: no request is made and `status` is `'idle'` (or `'success'` if the cache already has data for the key). Switching `enabled` to `true` starts the request.
- [ ] When `key` changes: abort the previous request's signal (unless another component still needs it), start a request for the new key, and never show data belonging to the old key.
- [ ] A response that arrives for a key the hook is no longer showing is ignored, even if the fetcher ignores the abort signal.
- [ ] On unmount, abort the request (unless another component still needs it) and never update state afterwards.
- [ ] Changing only the fetcher's identity between renders does not start a request.
- [ ] **Cache:** successful data is stored in a cache shared by all hook instances, keyed by `key`. A hook rendering a key that is already cached returns that data **on its very first render**, with `status: 'success'` and `isValidating: true`, then revalidates in the background and updates `data` when the new value arrives.
- [ ] **De-duplication:** hooks that request the same key while a request for it is in flight share that one request. The fetcher is called once, and all of them receive the result.
- [ ] `refetch()` starts a new request for the current key. `data` and `status: 'success'` remain while it runs, and `isValidating` is `true`.
- [ ] `clearCache()` removes all cached data and forgets in-flight requests.

## Non-functional requirements
- **Correctness first:** no state updates after unmount, no stale data after a key change, no leaked in-flight entries.
- **Performance:** a component that re-renders for unrelated reasons must not refetch. Hooks that share a key must not multiply network calls.
- **UX states:** consumers can tell "first load" (`loading`, no data) apart from "refreshing" (`success` + `isValidating`), so they can show a spinner or a subtle refresh indicator.
- **Typing:** `data` is typed from the fetcher's return type.
- **StrictMode:** effects may mount, unmount and mount again in development. The hook must still end up with correct data.

## Constraints
- 60 minutes. React only. No SWR, React Query or other libraries.
- Export `useFetch` and `clearCache` from `Solution.ts`. Keep `types.ts` unchanged.
- The Playground uses `getWeather(city, { signal })` from `src/mocks/api.ts`.

## Data / API contract
```ts
type FetchStatus = 'idle' | 'loading' | 'success' | 'error';
type Fetcher<T> = (key: string, signal: AbortSignal) => Promise<T>;

interface UseFetchOptions { enabled?: boolean } // default true

interface UseFetchResult<T> {
  data: T | undefined;
  error: unknown;
  status: FetchStatus;
  isValidating: boolean;
  refetch: () => void;
}

function useFetch<T>(key: string, fetcher: Fetcher<T>, options?: UseFetchOptions): UseFetchResult<T>;
function clearCache(): void;
```

## Test contract
- Tests import `useFetch` and `clearCache` as named exports and call `clearCache()` before every test.
- Hooks are rendered with `renderHook` from `@testing-library/react`.
- The fetchers in the tests are `vi.fn`s that return **deferred promises**, which the tests resolve or reject by hand. These promises **never react to the abort signal**, so ignoring stale responses has to be done by the hook itself.
- Tests read `signal.aborted` from the second argument the fetcher received.
- Tests record the value of `data` on every render to check that cached data is present on the first render.
- Tests assert the exact `status` strings and `isValidating` booleans listed above.

## Edge cases
- Key changes A → B → A quickly: only A's latest response may be shown. A's cached value appears immediately when you switch back.
- The fetcher resolves after the component unmounted: no warning, no state update.
- Two hooks share a request and one unmounts: the other still gets the data, and the signal is **not** aborted.
- The fetcher throws synchronously instead of returning a rejected promise.
- A revalidation fails while cached data exists: show the error but keep the stale data.
- `refetch()` called while a request is already in flight.
- An `AbortError` caused by the hook's own abort must never be shown as an error.

## Follow-ups
1. **TTL / dedupingInterval.** Add `staleTime` (ms). Within `staleTime` of the last successful fetch, a mount or key change uses the cache without revalidating.
2. **Subscribe to cache writes.** When one component's refetch updates the cache, every other mounted hook for that key re-renders with the new data. Consider `useSyncExternalStore`.
3. **Mutations.** Add `mutate(key, updater, { revalidate })` for optimistic updates, with rollback on failure.
4. **Revalidate on focus / reconnect.** Refetch when the window regains focus or goes back online, and throttle it.
5. **Retries.** Retry failed requests with exponential backoff (reuse S32), and cancel the retries when the key changes.

## Concepts covered
`AbortController` and signals · guarding against stale closures and responses · stale-while-revalidate · module-scoped caches · reference-counted shared requests · keeping the latest callback in a ref · `renderHook` and deferred promises.

Related: J25 hooks pack · S02 Autocomplete · S03 Infinite scroll · S32 retry with backoff.
