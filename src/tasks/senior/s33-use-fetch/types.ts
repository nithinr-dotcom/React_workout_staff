export type FetchStatus = 'idle' | 'loading' | 'success' | 'error';

/** Receives the key and an AbortSignal owned by the hook. */
export type Fetcher<T> = (key: string, signal: AbortSignal) => Promise<T>;

export interface UseFetchOptions {
  /** When false, no request is made. Default true. */
  enabled?: boolean;
}

export interface UseFetchResult<T> {
  /** Latest data for the *current* key (from the cache or a finished request), else undefined. */
  data: T | undefined;
  /** The error from the latest failed request for the current key, else undefined. */
  error: unknown;
  status: FetchStatus;
  /** True while a request for the current key is in flight (including background revalidation). */
  isValidating: boolean;
  /** Start a new request for the current key. Existing data stays visible until it resolves. */
  refetch: () => void;
}

export interface UseFetchModule {
  useFetch<T>(key: string, fetcher: Fetcher<T>, options?: UseFetchOptions): UseFetchResult<T>;
  /** Clears the shared data cache and forgets in-flight requests. Used by tests between cases. */
  clearCache(): void;
}
