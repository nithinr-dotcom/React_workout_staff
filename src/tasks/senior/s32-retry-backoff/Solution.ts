import type { RetryOptions } from './types';

// ⬇ Delete this line when you start. Tests for this task are skipped while it exists.
export const NOT_STARTED = true;

export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  // Your implementation here. Requirements are in README.md.
  void ms;
  void signal;
  throw new Error('sleep: not implemented');
}

export function withTimeout<T>(promise: Promise<T>, ms: number, signal?: AbortSignal): Promise<T> {
  void promise;
  void ms;
  void signal;
  throw new Error('withTimeout: not implemented');
}

export function retry<T>(fn: (attempt: number) => Promise<T>, options: RetryOptions = {}): Promise<T> {
  void fn;
  void options;
  throw new Error('retry: not implemented');
}
