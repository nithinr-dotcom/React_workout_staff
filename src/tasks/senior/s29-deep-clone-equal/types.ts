export interface DeepModule {
  /** Returns a deep copy of `value`. Shared and circular references are preserved in the copy. */
  deepClone<T>(value: T): T;
  /** Structural equality. NaN equals NaN, 0 equals -0, cycles are supported. */
  deepEqual(a: unknown, b: unknown): boolean;
}
