import type { DeepMergeOptions, PlainObject, SquashOptions } from './types';

// ⬇ Delete this line when you start. Tests for this task are skipped while it exists.
export const NOT_STARTED = true;

// Your implementation here. Requirements are in README.md.

export function groupBy<T>(arr: readonly T[], keyFnOrProp: ((item: T) => PropertyKey) | keyof T): Record<string, T[]> {
  void arr;
  void keyFnOrProp;
  throw new Error('groupBy: not implemented');
}

export function chunk<T>(arr: readonly T[], size: number): T[][] {
  void arr;
  void size;
  throw new Error('chunk: not implemented');
}

export function deepMerge<A extends PlainObject, B extends PlainObject>(a: A, b: B, options: DeepMergeOptions = {}): A & B {
  void a;
  void b;
  void options;
  throw new Error('deepMerge: not implemented');
}

export function deepOmit<T>(value: T, keys: readonly string[]): T {
  void value;
  void keys;
  throw new Error('deepOmit: not implemented');
}

export function squashObject(obj: PlainObject, options: SquashOptions = {}): PlainObject {
  void obj;
  void options;
  throw new Error('squashObject: not implemented');
}

export function unsquashObject(flat: PlainObject, options: SquashOptions = {}): PlainObject {
  void flat;
  void options;
  throw new Error('unsquashObject: not implemented');
}
