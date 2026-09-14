import type { HitCounter, RateLimiter, RateLimiterOptions, TokenBucket, TokenBucketOptions } from './types';

// ⬇ Delete this line when you start. Tests for this task are skipped while it exists.
export const NOT_STARTED = true;

export function createHitCounter(windowMs: number, now: () => number = Date.now): HitCounter {
  // Your implementation here. Requirements are in README.md.
  void windowMs;
  void now;
  throw new Error('createHitCounter: not implemented');
}

export function createRateLimiter(options: RateLimiterOptions): RateLimiter {
  void options;
  throw new Error('createRateLimiter: not implemented');
}

/** Follow-up 1 */
export function createTokenBucket(options: TokenBucketOptions): TokenBucket {
  void options;
  throw new Error('createTokenBucket: not implemented');
}
