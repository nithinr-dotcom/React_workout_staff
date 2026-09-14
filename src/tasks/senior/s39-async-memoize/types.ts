export interface MemoizeAsyncOptions<Args extends unknown[]> {
  /** How long a fulfilled value stays cached, in ms, measured from when the promise FULFILLED. Default: Infinity. */
  ttl?: number;
  /** Builds the cache key from the arguments. Default: a stable serialisation of all arguments. */
  key?: (...args: Args) => string;
  /** Clock used for TTL. Default: Date.now. */
  now?: () => number;
  /** Follow-up 2: keep at most this many entries, evicting the least recently used. Default: unbounded. */
  maxSize?: number;
}

export interface MemoizedAsync<Args extends unknown[], R> {
  (...args: Args): Promise<R>;
  /** Drops every entry, in-flight or fulfilled. */
  clear(): void;
  /** Drops the entry for these arguments (keyed the same way as a call). Returns whether one existed. */
  delete(...args: Args): boolean;
}

/** Node-style callback used by follow-up 1. */
export type NodeCallback<R> = (error: unknown, result?: R) => void;

export interface AsyncMemoizeModule {
  memoizeAsync<Args extends unknown[], R>(
    fn: (...args: Args) => Promise<R>,
    options?: MemoizeAsyncOptions<Args>,
  ): MemoizedAsync<Args, R>;

  /** Follow-up 1: the same caching and dedupe for callback-style functions. */
  memoizeCallback<Args extends unknown[], R>(
    fn: (...args: [...Args, NodeCallback<R>]) => void,
    options?: MemoizeAsyncOptions<Args>,
  ): (...args: [...Args, NodeCallback<R>]) => void;
}
