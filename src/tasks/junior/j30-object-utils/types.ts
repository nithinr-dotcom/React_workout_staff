export type PlainObject = Record<string, unknown>;

export interface DeepMergeOptions {
  /** Follow-up 2. How to combine two arrays at the same key. Default `'replace'`. */
  arrays?: 'replace' | 'concat';
}

export interface SquashOptions {
  /** Follow-up 4. The string placed between path segments. Default `'.'`. */
  separator?: string;
}

export interface ObjectUtilsModule {
  /** Groups items by `keyFn(item)` or by `item[prop]`. Keys are stringified. */
  groupBy<T>(arr: readonly T[], keyFnOrProp: ((item: T) => PropertyKey) | keyof T): Record<string, T[]>;

  /** Splits `arr` into arrays of `size` items; the last one may be shorter. */
  chunk<T>(arr: readonly T[], size: number): T[][];

  /** Returns a new object: plain objects merge recursively, everything else (arrays included) from `b` replaces. */
  deepMerge<A extends PlainObject, B extends PlainObject>(a: A, b: B, options?: DeepMergeOptions): A & B;

  /** Returns a copy of `value` with every property named in `keys` removed, at any depth (arrays included). */
  deepOmit<T>(value: T, keys: readonly string[]): T;

  /** Flattens nested objects/arrays into one level of `'a.b.0'` path keys. */
  squashObject(obj: PlainObject, options?: SquashOptions): PlainObject;

  /** The inverse of `squashObject`: rebuilds nested objects, using arrays for numeric segments. */
  unsquashObject(flat: PlainObject, options?: SquashOptions): PlainObject;
}
