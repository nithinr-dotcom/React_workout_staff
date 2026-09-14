import type { Fetcher, UseFetchOptions, UseFetchResult } from './types';

// ⬇ Delete this line when you start. Tests for this task are skipped while it exists.
export const NOT_STARTED = true;

export function useFetch<T>(key: string, fetcher: Fetcher<T>, options: UseFetchOptions = {}): UseFetchResult<T> {
  // Your implementation here. Requirements are in README.md.
  void key;
  void fetcher;
  void options;
  throw new Error('useFetch: not implemented');
}

export function clearCache(): void {
  throw new Error('clearCache: not implemented');
}
