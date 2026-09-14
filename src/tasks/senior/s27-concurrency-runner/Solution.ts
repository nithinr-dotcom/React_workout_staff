import type { Queue, QueueOptions } from './types';

// ⬇ Delete this line when you start. Tests for this task are skipped while it exists.
export const NOT_STARTED = true;

export function mapAsyncLimit<T, R>(
  items: Iterable<T>,
  limit: number,
  fn: (item: T, index: number) => R | PromiseLike<R>,
): Promise<R[]> {
  // Your implementation here. Requirements are in README.md.
  void items;
  void limit;
  void fn;
  throw new Error('mapAsyncLimit: not implemented');
}

export function createQueue(options: QueueOptions): Queue {
  void options;
  throw new Error('createQueue: not implemented');
}
