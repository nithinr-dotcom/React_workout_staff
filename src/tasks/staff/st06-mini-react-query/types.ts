import type { ReactNode } from 'react';

/*
 * Minimal public contract. The tests and Playground depend on these names and shapes.
 * Extend it freely (select, placeholderData, refetchOnWindowFocus, …) without breaking what is here.
 */

export type QueryKey = readonly unknown[];

/** 'pending' = no data yet (whether or not a fetch is running). */
export type QueryStatus = 'pending' | 'success' | 'error';

export interface QueryFunctionContext {
  queryKey: QueryKey;
  /** Aborted when the query is cancelled or garbage-collected mid-flight. */
  signal: AbortSignal;
}

export interface QueryOptions {
  /** ms after a successful fetch during which data counts as fresh. Default 0. */
  staleTime?: number;
  /** ms an unused query (no observers) stays in the cache before removal. Default 300_000. */
  gcTime?: number;
  /** Extra attempts after the first failure. Default 3. */
  retry?: number;
  /** ms before retry number `attempt` (1-based). Default: exponential backoff capped at 30s. */
  retryDelay?: number | ((attempt: number, error: unknown) => number);
}

export interface UseQueryOptions<T> extends QueryOptions {
  queryKey: QueryKey;
  queryFn: (context: QueryFunctionContext) => Promise<T>;
  /** When false, the query never fetches automatically. Default true. */
  enabled?: boolean;
}

export interface UseQueryResult<T> {
  data: T | undefined;
  error: unknown;
  status: QueryStatus;
  /** True while any fetch for this key is in flight, including background refetches. */
  isFetching: boolean;
  /** Fetches now, even if the data is fresh. Resolves when the fetch settles; never rejects. */
  refetch: () => Promise<void>;
}

export type MutationStatus = 'idle' | 'pending' | 'success' | 'error';

export interface UseMutationOptions<TData, TVariables> {
  mutationFn: (variables: TVariables) => Promise<TData>;
  onSuccess?: (data: TData, variables: TVariables) => unknown;
  onError?: (error: unknown, variables: TVariables) => unknown;
  onSettled?: (data: TData | undefined, error: unknown, variables: TVariables) => unknown;
}

export interface UseMutationResult<TData, TVariables> {
  /** Fire-and-forget. Errors are reported through state and onError, never thrown. */
  mutate: (variables: TVariables) => void;
  mutateAsync: (variables: TVariables) => Promise<TData>;
  data: TData | undefined;
  error: unknown;
  status: MutationStatus;
  reset: () => void;
}

export interface QueryClientConfig {
  defaultOptions?: { queries?: QueryOptions };
}

/** The instance API of QueryClient that tests and the Playground rely on. */
export interface QueryClientApi {
  getQueryData<T>(queryKey: QueryKey): T | undefined;
  setQueryData<T>(queryKey: QueryKey, data: T): void;
  /**
   * Marks every query whose key starts with `keyPrefix` as stale, and refetches the ones that have observers.
   * Resolves when those refetches settle.
   */
  invalidateQueries(keyPrefix: QueryKey): Promise<void>;
  /** Removes every query from the cache. */
  clear(): void;
}

export interface QueryClientProviderProps {
  client: QueryClientApi;
  children?: ReactNode;
}

export interface MiniReactQueryModule {
  QueryClient: new (config?: QueryClientConfig) => QueryClientApi;
  QueryClientProvider(props: QueryClientProviderProps): ReactNode;
  useQueryClient(): QueryClientApi;
  useQuery<T>(options: UseQueryOptions<T>): UseQueryResult<T>;
  useMutation<TData, TVariables = void>(options: UseMutationOptions<TData, TVariables>): UseMutationResult<TData, TVariables>;
  /** Deterministic string for a key: object property order must not matter. */
  hashKey(queryKey: QueryKey): string;
}
