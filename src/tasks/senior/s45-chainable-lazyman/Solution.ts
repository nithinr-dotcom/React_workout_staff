import type { ApiClient, ApiClientOptions, FetchLike, ILazyMan } from './types';

// ⬇ Delete this line when you start. Tests for this task are skipped while it exists.
export const NOT_STARTED = true;

export function LazyMan(name: string, log: (message: string) => void): ILazyMan {
  // Your implementation here. Requirements are in README.md.
  void name;
  void log;
  throw new Error('LazyMan: not implemented');
}

export function createApiClient(fetchImpl: FetchLike, options: ApiClientOptions = {}): ApiClient {
  void fetchImpl;
  void options;
  throw new Error('createApiClient: not implemented');
}
