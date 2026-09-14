import type { AnyFn, NestedArray } from './types';

// ⬇ Delete this line when you start. Tests for this task are skipped while it exists.
export const NOT_STARTED = true;

// Your implementation here. Requirements are in README.md.

export function myNew(Ctor: AnyFn, ...args: unknown[]): any {
  void Ctor;
  void args;
  throw new Error('myNew: not implemented');
}

export function myInstanceOf(obj: unknown, Ctor: unknown): boolean {
  void obj;
  void Ctor;
  throw new Error('myInstanceOf: not implemented');
}

export function myObjectCreate(proto: object | null, props?: PropertyDescriptorMap): any {
  void proto;
  void props;
  throw new Error('myObjectCreate: not implemented');
}

export function myObjectAssign(target: unknown, ...sources: unknown[]): any {
  void target;
  void sources;
  throw new Error('myObjectAssign: not implemented');
}

export function myFlat<T>(arr: readonly (T | NestedArray<T>)[], depth = 1): Array<T | NestedArray<T>> {
  void arr;
  void depth;
  throw new Error('myFlat: not implemented');
}

/** Follow-up 3. */
export function myFlatMap<T, U>(
  arr: readonly T[],
  cb: (value: T, index: number, array: readonly T[]) => U | readonly U[],
  thisArg?: unknown,
): U[] {
  void arr;
  void cb;
  void thisArg;
  throw new Error('myFlatMap: not implemented');
}
