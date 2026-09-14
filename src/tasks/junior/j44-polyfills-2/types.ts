export type AnyFn = (this: any, ...args: any[]) => any;
export type NestedArray<T> = Array<T | NestedArray<T>>;

export interface Polyfills2Module {
  /** `new Ctor(...args)` without `new`. */
  myNew(Ctor: AnyFn, ...args: unknown[]): any;

  /** `obj instanceof Ctor` without `instanceof`. */
  myInstanceOf(obj: unknown, Ctor: unknown): boolean;

  /** `Object.create(proto, props)` without `Object.create`. */
  myObjectCreate(proto: object | null, props?: PropertyDescriptorMap): any;

  /** `Object.assign(target, ...sources)` without `Object.assign` or object spread. */
  myObjectAssign(target: unknown, ...sources: unknown[]): any;

  /** `arr.flat(depth)` without `flat`/`flatMap`. */
  myFlat<T>(arr: readonly (T | NestedArray<T>)[], depth?: number): Array<T | NestedArray<T>>;

  /** Follow-up 3: `arr.flatMap(cb, thisArg)` without `flat`/`flatMap`. */
  myFlatMap<T, U>(arr: readonly T[], cb: (value: T, index: number, array: readonly T[]) => U | readonly U[], thisArg?: unknown): U[];
}
