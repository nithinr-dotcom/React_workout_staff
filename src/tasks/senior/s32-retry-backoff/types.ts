export interface RetryOptions {
  /** Retries after the first attempt. Total attempts = retries + 1. Default 3. */
  retries?: number;
  /** Delay before the first retry, in ms. Default 100. */
  baseDelay?: number;
  /** Multiplier applied per retry. Default 2. */
  factor?: number;
  /** Upper bound for a single delay, in ms. Default Infinity. */
  maxDelay?: number;
  /** Full jitter: multiply each computed delay by random(). Default false. */
  jitter?: boolean;
  /** Random source in [0, 1) used when jitter is on. Default Math.random. */
  random?: () => number;
  /** Decides whether a failed attempt should be retried. `attempt` is the 1-based attempt that just failed. Default: always. */
  shouldRetry?: (error: unknown, attempt: number) => boolean;
  /** Aborting rejects with an AbortError and stops future attempts. */
  signal?: AbortSignal;
}

export interface RetryModule {
  /** Resolves after `ms`. Rejects with an AbortError if `signal` aborts first. */
  sleep(ms: number, signal?: AbortSignal): Promise<void>;
  /** Settles like `promise` if it settles within `ms`, otherwise rejects with an error named "TimeoutError". */
  withTimeout<T>(promise: Promise<T>, ms: number, signal?: AbortSignal): Promise<T>;
  /** Calls `fn(attempt)` (1-based) until it resolves, retries run out, shouldRetry says no, or the signal aborts. */
  retry<T>(fn: (attempt: number) => Promise<T>, options?: RetryOptions): Promise<T>;
}
