export interface HitCounter {
  /** Records one hit at `now()`. */
  hit(): void;
  /** Number of hits recorded at a time `t` with `now() - t < windowMs`. */
  count(): number;
}

export type OverLimitBehaviour = 'reject' | 'queue';

export interface RateLimiterOptions {
  /** Maximum number of acquisitions inside any rolling window. */
  limit: number;
  /** Rolling window length in ms. */
  windowMs: number;
  /** Clock. Default: Date.now. */
  now?: () => number;
  /** What `wrap`ped functions do when over the limit. Default: 'reject'. */
  onLimit?: OverLimitBehaviour;
}

export interface RateLimiter {
  /** Takes a permit if one is free right now. Failed attempts don't use up a permit. */
  tryAcquire(): boolean;
  /**
   * Returns a function that takes a permit before calling `fn`.
   * 'reject': over the limit, reject with an error named 'RateLimitError' that has `retryAfterMs`.
   * 'queue': over the limit, wait (FIFO) until a permit frees up, then call `fn`.
   */
  wrap<Args extends unknown[], R>(fn: (...args: Args) => R | PromiseLike<R>): (...args: Args) => Promise<R>;
}

/** The error `wrap` rejects with in 'reject' mode. */
export interface RateLimitErrorLike extends Error {
  name: 'RateLimitError';
  /** Milliseconds until the next permit frees up. */
  retryAfterMs: number;
}

export interface TokenBucketOptions {
  /** Maximum tokens. The bucket starts full. */
  capacity: number;
  /** Tokens added per second, continuously. */
  refillPerSecond: number;
  /** Clock. Default: Date.now. */
  now?: () => number;
}

export interface TokenBucket {
  /** Removes `count` tokens (default 1) if that many are available. */
  tryRemove(count?: number): boolean;
  /** Tokens currently available (may be fractional). */
  tokens(): number;
}

export interface RateLimiterModule {
  createHitCounter(windowMs: number, now?: () => number): HitCounter;
  createRateLimiter(options: RateLimiterOptions): RateLimiter;
  /** Follow-up 1 */
  createTokenBucket(options: TokenBucketOptions): TokenBucket;
}
