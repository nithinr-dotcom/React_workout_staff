# Mini React Query

## Problem statement
Most "state management" in a product app is really a **cache of server data**. Build a small version of TanStack Query.

- A `QueryClient` owns a cache of queries, keyed by a stable hash of a `queryKey` array.
- `useQuery({ queryKey, queryFn, staleTime, gcTime, enabled, retry })` subscribes a component to one cache entry.
  - It fetches when needed and **dedupes** concurrent requests for the same key.
  - It serves cached data immediately and **revalidates in the background** when the data is stale.
  - It retries failures, and garbage-collects entries that no component has used for `gcTime` ms.
- `useMutation({ mutationFn, onSuccess })` runs writes. `queryClient.invalidateQueries(keyPrefix)` marks related queries stale and refetches them.

This is a staff round, so the cache design (what is an entry, who subscribes to what, when timers start and stop) is the core of the exercise. `types.ts` is the minimal contract the tests rely on. Extend it freely (for example `select`, `placeholderData` or `refetchOnWindowFocus`), but don't break it.

## Clarifying questions to ask
- What counts as the same query? *(Keys are compared by a deterministic hash. `['todos', { page: 1, sort: 'a' }]` and `['todos', { sort: 'a', page: 1 }]` are the same query.)*
- What does `staleTime: 0` mean? *(Data is stale as soon as it arrives. A newly mounted observer triggers a background refetch, but still sees the cached data immediately.)*
- Should unmounting abort the request? *(No. Let it finish and populate the cache. Aborting is a follow-up.)*
- When does garbage collection start? *(When the last observer of a query unsubscribes. A new observer cancels the pending removal.)*
- Should `invalidateQueries` refetch queries that nobody is observing? *(No. Mark them stale so the next observer refetches them.)*
- Should a failed background refetch wipe existing data? *(No. Keep `data`, set `error`, and set `status: 'error'`.)*
- Default retries? *(3, with exponential backoff. Tests pass `retry` and `retryDelay` explicitly.)*

## Functional requirements
- [ ] `new QueryClient(config?)` creates an isolated cache. `config.defaultOptions.queries` supplies default `staleTime`, `gcTime`, `retry` and `retryDelay`.
- [ ] `<QueryClientProvider client>` provides the client. `useQueryClient()` returns it and throws a helpful error outside a provider.
- [ ] `hashKey(queryKey)` returns a deterministic string. Object property order doesn't matter; value types do (`1` ≠ `'1'`).
- [ ] `useQuery` returns `{ data, error, status, isFetching, refetch }`:
  - `status` is `'pending'` until the first success, `'success'` after it, and `'error'` when the latest fetch failed after all retries.
  - `isFetching` is `true` while any fetch for that key is in flight, including background refetches.
- [ ] `queryFn` is called with `{ queryKey, signal }`, where `signal` is an `AbortSignal`.
- [ ] **Dedupe:** while a fetch for a key is in flight, other observers and `refetch()` calls share that request.
- [ ] **Cache:** a component that mounts with a key already in the cache renders the cached `data` on its **first render**.
- [ ] **Stale-while-revalidate:** on mount, if the entry is missing, stale (older than `staleTime`) or invalidated, fetch in the background while showing cached data.
- [ ] `enabled: false` never fetches automatically. Switching it to `true` fetches if needed.
- [ ] Changing `queryKey` switches the hook to the new entry and fetches it if needed. The old entry stays in the cache.
- [ ] `refetch()` fetches even when the data is fresh.
- [ ] **Retries:** after a failure, retry up to `retry` times, waiting `retryDelay` ms (a number, or a function of the attempt) before each retry.
- [ ] **Garbage collection:** `gcTime` ms after an entry loses its last observer, remove it from the cache. `getQueryData` then returns `undefined`.
- [ ] `getQueryData(key)` and `setQueryData(key, data)` read and write the cache. Writes notify observers.
- [ ] `invalidateQueries(prefix)` matches every key whose leading elements deep-equal `prefix` (`['todos']` matches `['todos', { page: 1 }]` but not `['todo']`). It marks them stale, refetches the ones with observers, and resolves when those refetches settle.
- [ ] `useMutation({ mutationFn, onSuccess, onError, onSettled })` returns `{ mutate, mutateAsync, data, error, status, reset }`. `status` goes `'idle'` → `'pending'` → `'success' | 'error'`.

## Non-functional requirements
- **Rendering:** an observer re-renders only when its own entry changes. A fetch for `['user']` doesn't re-render components that observe `['todos']`. Use `useSyncExternalStore` or an equivalent subscription with a cached snapshot.
- **No leaks:** timers (retry, gc) and subscriptions are cleaned up. After `clear()` no timers keep firing into removed entries.
- **Race safety:** a response for a key the component no longer observes must not overwrite what the component shows for its current key.
- **Resilience:** `mutate` never throws or causes an unhandled promise rejection. `refetch` never rejects.
- **Accessibility (Playground):** loading and error states are announced with `role="status"` and `role="alert"`, and buttons show when they are busy.

## Constraints
- 110 minutes. React only. No `@tanstack/*`, `swr` or similar.
- The Playground uses `getUsers`, `getTodos` and `saveTodo` from `src/mocks/api.ts`. Tests use injected `vi.fn()` query functions.
- Export everything in `MiniReactQueryModule` as named exports from `Solution.tsx`.

## Data / API contract
```ts
type QueryKey = readonly unknown[];
type QueryStatus = 'pending' | 'success' | 'error';
interface QueryFunctionContext { queryKey: QueryKey; signal: AbortSignal }

interface QueryOptions {
  staleTime?: number;   // default 0
  gcTime?: number;      // default 300_000 (a.k.a. cacheTime)
  retry?: number;       // default 3
  retryDelay?: number | ((attempt: number, error: unknown) => number);
}
interface UseQueryOptions<T> extends QueryOptions {
  queryKey: QueryKey;
  queryFn: (context: QueryFunctionContext) => Promise<T>;
  enabled?: boolean;    // default true
}
interface UseQueryResult<T> {
  data: T | undefined;
  error: unknown;
  status: QueryStatus;
  isFetching: boolean;
  refetch: () => Promise<void>;
}

type MutationStatus = 'idle' | 'pending' | 'success' | 'error';
interface UseMutationOptions<TData, TVariables> {
  mutationFn: (variables: TVariables) => Promise<TData>;
  onSuccess?: (data: TData, variables: TVariables) => unknown;
  onError?: (error: unknown, variables: TVariables) => unknown;
  onSettled?: (data: TData | undefined, error: unknown, variables: TVariables) => unknown;
}
interface UseMutationResult<TData, TVariables> {
  mutate: (variables: TVariables) => void;
  mutateAsync: (variables: TVariables) => Promise<TData>;
  data: TData | undefined;
  error: unknown;
  status: MutationStatus;
  reset: () => void;
}

interface QueryClientConfig { defaultOptions?: { queries?: QueryOptions } }
interface QueryClientApi {
  getQueryData<T>(queryKey: QueryKey): T | undefined;
  setQueryData<T>(queryKey: QueryKey, data: T): void;
  invalidateQueries(keyPrefix: QueryKey): Promise<void>;
  clear(): void;
}
interface QueryClientProviderProps { client: QueryClientApi; children?: ReactNode }

interface MiniReactQueryModule {
  QueryClient: new (config?: QueryClientConfig) => QueryClientApi;
  QueryClientProvider(props: QueryClientProviderProps): ReactNode;
  useQueryClient(): QueryClientApi;
  useQuery<T>(options: UseQueryOptions<T>): UseQueryResult<T>;
  useMutation<TData, TVariables = void>(options: UseMutationOptions<TData, TVariables>): UseMutationResult<TData, TVariables>;
  hashKey(queryKey: QueryKey): string;
}
```

## Test contract
- Named exports: `QueryClient`, `QueryClientProvider`, `useQueryClient`, `useQuery`, `useMutation`, `hashKey`.
- Every test creates a fresh `new QueryClient()` and uses real timers. Tests render their own probe component that prints `status`, `isFetching`, `data` and `error.message` as text.
- Query keys in tests are inline array literals, so they are new arrays on every render. Identity must not matter.
- Tests pass `retry` and `retryDelay: 0` explicitly, and use `gcTime: 50` for the garbage-collection test. Tests wait with `findBy*` and `waitFor`, whose default timeout is 1s.
- Asserted behaviour:
  - The first render with a cached key already shows the data.
  - Two observers mounted together call `queryFn` once.
  - A retry count of 2 means 3 calls in total.
  - `invalidateQueries(['todos'])` refetches `['todos', { page: 1 }]` even with a large `staleTime`, and leaves `['user']` alone.

## Edge cases
- `queryFn` resolves after its entry was garbage-collected, or after `clear()`.
- Two components observe the same key with different `staleTime` values.
- `enabled` flips to `false` while a fetch is in flight.
- `refetch()` while a retry is waiting for its delay.
- `invalidateQueries` during an in-flight fetch. Should the in-flight result count as fresh?
- Keys containing `undefined`, `Date` or class instances. Decide what `hashKey` supports and document it.
- A mutation whose component unmounts before it settles.

## Follow-ups
1. **Optimistic updates.** Add `onMutate` (returning a rollback context) so a todo appears instantly, and roll back with `setQueryData` when the mutation fails.
2. **Cancellation.** Abort the in-flight request (through `signal`) when an entry is garbage-collected, and expose `queryClient.cancelQueries(prefix)`. What should `status` be after a cancel?
3. **Window focus and reconnect.** Refetch stale, observed queries on `visibilitychange` and `online`, with a single global listener rather than one per hook.
4. **Paginated and infinite queries.** Keep previous data while the next page loads (`placeholderData: keepPrevious`), then build `useInfiniteQuery` with `getNextPageParam`.
5. **SSR hydration.** Add `dehydrate(client)` and `<HydrationBoundary state>` so data fetched on the server seeds the client cache without a second fetch.
6. **Suspense mode.** Add `useSuspenseQuery`, which throws the in-flight promise. How do you avoid a waterfall when two sibling components suspend?

## Concepts covered
Server state as a cache · deterministic key hashing · promise deduplication · stale-while-revalidate · observer subscriptions with `useSyncExternalStore` · timer lifecycles (retry, gc) · prefix invalidation · mutation state machines.

Related: ST05 Mini Redux · ST11 Offline-first Sync · S02 Autocomplete (race conditions).

## Design discussion prompts
- Why is server state different from client state, and why do Redux-style stores handle it badly?
- Walk me through the lifecycle of one cache entry from the first `useQuery` to garbage collection. Which timers exist and who owns them?
- How do you guarantee `isFetching` and `data` stay consistent when a response arrives for a key the component no longer observes?
- `staleTime: 0` versus `Infinity` versus 30s: how would you pick defaults for a product org? What metrics tell you the choice was wrong?
- Invalidating by key prefix couples key naming to invalidation. How would you standardise query keys across 20 teams (for example, key factories)?
- A query refetches in a loop in production. How would you debug it, and what DevTools would you build into the library?
- Where does this abstraction break down: real-time data, very large lists, or offline? What would you use instead?
- How would you test retry and gc behaviour without making the test suite slow or flaky?
