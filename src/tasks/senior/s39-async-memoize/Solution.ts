import type { MemoizeAsyncOptions, MemoizedAsync, NodeCallback } from './types';

// ⬇ Delete this line when you start. Tests for this task are skipped while it exists.
export const NOT_STARTED = true;

export function memoizeAsync<Args extends unknown[], R>(
  fn: (...args: Args) => Promise<R>,
  options: MemoizeAsyncOptions<Args> = {},
): MemoizedAsync<Args, R> {
  // Your implementation here. Requirements are in README.md.
  void fn;
  void options;
  throw new Error('memoizeAsync: not implemented');
}

/** Follow-up 1 */
export function memoizeCallback<Args extends unknown[], R>(
  fn: (...args: [...Args, NodeCallback<R>]) => void,
  options: MemoizeAsyncOptions<Args> = {},
): (...args: [...Args, NodeCallback<R>]) => void {
  void fn;
  void options;
  throw new Error('memoizeCallback: not implemented');
}
