import type {
  QueryClientApi,
  QueryClientConfig,
  QueryClientProviderProps,
  QueryKey,
  UseMutationOptions,
  UseMutationResult,
  UseQueryOptions,
  UseQueryResult,
} from './types';

// ⬇ Delete this line when you start. Tests for this task are skipped while it exists.
export const NOT_STARTED = true;

// Your implementation here. Requirements are in README.md.

export function hashKey(queryKey: QueryKey): string {
  void queryKey;
  throw new Error('hashKey: not implemented');
}

export class QueryClient implements QueryClientApi {
  constructor(config: QueryClientConfig = {}) {
    void config;
    throw new Error('QueryClient: not implemented');
  }

  getQueryData<T>(queryKey: QueryKey): T | undefined {
    void queryKey;
    throw new Error('QueryClient.getQueryData: not implemented');
  }

  setQueryData<T>(queryKey: QueryKey, data: T): void {
    void queryKey;
    void data;
    throw new Error('QueryClient.setQueryData: not implemented');
  }

  invalidateQueries(keyPrefix: QueryKey): Promise<void> {
    void keyPrefix;
    throw new Error('QueryClient.invalidateQueries: not implemented');
  }

  clear(): void {
    throw new Error('QueryClient.clear: not implemented');
  }
}

export function QueryClientProvider({ client, children }: QueryClientProviderProps) {
  void client;
  return <>{children}</>;
}

export function useQueryClient(): QueryClientApi {
  throw new Error('useQueryClient: not implemented');
}

export function useQuery<T>(options: UseQueryOptions<T>): UseQueryResult<T> {
  void options;
  throw new Error('useQuery: not implemented');
}

export function useMutation<TData, TVariables = void>(
  options: UseMutationOptions<TData, TVariables>,
): UseMutationResult<TData, TVariables> {
  void options;
  throw new Error('useMutation: not implemented');
}
