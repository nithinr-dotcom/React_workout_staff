/**
 * The recipe mutates `draft` in place and returns nothing, or returns a completely new value
 * (without touching the draft). Returning the draft itself counts as returning nothing.
 */
export type Recipe<T> = (draft: T) => T | void | undefined;

/** Follow-up 1. */
export interface ProduceOptions {
  /** Deep-freeze every object and array in the result that was created by this call. */
  autoFreeze?: boolean;
}

/** Follow-up 3. Paths are property keys from the root; array indexes are numbers. */
export interface Patch {
  op: 'replace' | 'add' | 'remove';
  path: (string | number)[];
  value?: unknown;
}

export interface ProduceModule {
  /** Returns the next state. Untouched subtrees are the same references as in `base`; no changes returns `base`. */
  produce<T>(base: T, recipe: Recipe<T>, options?: ProduceOptions): T;

  /** Follow-up 3. `[nextState, patches, inversePatches]`. */
  produceWithPatches<T>(base: T, recipe: Recipe<T>): [T, Patch[], Patch[]];

  /** Follow-up 3. Applies patches immutably and returns the new state. */
  applyPatches<T>(base: T, patches: Patch[]): T;
}
