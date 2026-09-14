import type { ClassValue, NestedArray, PathSegment } from './types';

// ⬇ Delete this line when you start. Tests for this task are skipped while it exists.
export const NOT_STARTED = true;

// Your implementation here. Requirements are in README.md.

export function flatten<T>(arr: NestedArray<T>, depth = Infinity): Array<T | NestedArray<T>> {
  void arr;
  void depth;
  throw new Error('flatten: not implemented');
}

export function get<D = undefined>(obj: unknown, path: string | PathSegment[], defaultValue?: D): unknown {
  void obj;
  void path;
  void defaultValue;
  throw new Error('get: not implemented');
}

export function classnames(...args: ClassValue[]): string {
  void args;
  throw new Error('classnames: not implemented');
}

/** Follow-up 1. */
export function set<T extends object>(obj: T, path: string | PathSegment[], value: unknown): T {
  void obj;
  void path;
  void value;
  throw new Error('set: not implemented');
}
