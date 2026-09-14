import type { Patch, ProduceOptions, Recipe } from './types';

// ⬇ Delete this line when you start. Tests for this task are skipped while it exists.
export const NOT_STARTED = true;

// Your implementation here. Requirements are in README.md.

export function produce<T>(base: T, recipe: Recipe<T>, options: ProduceOptions = {}): T {
  void base;
  void recipe;
  void options;
  throw new Error('produce: not implemented');
}

/** Follow-up 3. */
export function produceWithPatches<T>(base: T, recipe: Recipe<T>): [T, Patch[], Patch[]] {
  void base;
  void recipe;
  throw new Error('produceWithPatches: not implemented');
}

/** Follow-up 3. */
export function applyPatches<T>(base: T, patches: Patch[]): T {
  void base;
  void patches;
  throw new Error('applyPatches: not implemented');
}
