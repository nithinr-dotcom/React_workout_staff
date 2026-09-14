export type NestedArray<T> = Array<T | NestedArray<T>>;

export type PathSegment = string | number;

export type ClassDictionary = Record<string, unknown>;
export type ClassValue = string | number | boolean | null | undefined | ClassDictionary | ClassValue[];

export interface UtilsModule {
  /** Flattens `arr` up to `depth` levels (default Infinity). Never mutates the input. */
  flatten<T>(arr: NestedArray<T>, depth?: number): Array<T | NestedArray<T>>;

  /** Reads a nested value by path (`'a.b[0].c'` or `['a', 'b', 0, 'c']`). Returns `defaultValue` when the result is `undefined`. */
  get<D = undefined>(obj: unknown, path: string | PathSegment[], defaultValue?: D): unknown;

  /** Joins truthy class names from strings, numbers, objects and (nested) arrays with single spaces. */
  classnames(...args: ClassValue[]): string;

  /** Follow-up 1: writes a nested value by path, creating objects/arrays as needed. Mutates and returns `obj`. */
  set<T extends object>(obj: T, path: string | PathSegment[], value: unknown): T;
}
