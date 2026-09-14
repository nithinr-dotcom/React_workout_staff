import type { Throttled, ThrottleOptions } from './types';

// ⬇ Delete this line when you start. Tests for this task are skipped while it exists.
export const NOT_STARTED = true;

export function throttle<Args extends unknown[]>(
  fn: (...args: Args) => void,
  wait: number,
  options: ThrottleOptions = {},
): Throttled<Args> {
  // Your implementation here. Requirements are in README.md.
  void fn;
  void wait;
  void options;
  throw new Error('throttle: not implemented');
}
