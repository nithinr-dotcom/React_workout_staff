import type { RefObject } from 'react';

export type SetStateArg<T> = T | ((prev: T) => T);

export interface HooksModule {
  /** `[value, toggle, setValue]`. `toggle()` flips the value; `setValue(v)` sets it. Both are stable across renders. */
  useToggle(initialValue?: boolean): [boolean, () => void, (value: boolean) => void];

  /** The value passed on the previous render; `undefined` on the first render. */
  usePrevious<T>(value: T): T | undefined;

  /** State mirrored to `localStorage[key]` as JSON. `[value, setValue, remove]`. */
  useLocalStorage<T>(key: string, initialValue: T): [T, (value: SetStateArg<T>) => void, () => void];

  /** Calls `handler` when a pointer press happens outside `ref.current`. */
  useClickOutside<E extends HTMLElement>(ref: RefObject<E | null>, handler: (event: Event) => void): void;

  /** Returns `value`, but only after it has stopped changing for `delay` ms. */
  useDebounce<T>(value: T, delay: number): T;
}
