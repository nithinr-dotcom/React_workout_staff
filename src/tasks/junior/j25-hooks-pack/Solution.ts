import type { RefObject } from 'react';
import type { SetStateArg } from './types';

// ⬇ Delete this line when you start. Tests for this task are skipped while it exists.
export const NOT_STARTED = true;

// Your implementation here. Requirements are in README.md.

export function useToggle(initialValue = false): [boolean, () => void, (value: boolean) => void] {
  void initialValue;
  throw new Error('useToggle: not implemented');
}

export function usePrevious<T>(value: T): T | undefined {
  void value;
  throw new Error('usePrevious: not implemented');
}

export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: SetStateArg<T>) => void, () => void] {
  void key;
  void initialValue;
  throw new Error('useLocalStorage: not implemented');
}

export function useClickOutside<E extends HTMLElement>(ref: RefObject<E | null>, handler: (event: Event) => void): void {
  void ref;
  void handler;
  throw new Error('useClickOutside: not implemented');
}

export function useDebounce<T>(value: T, delay: number): T {
  void value;
  void delay;
  throw new Error('useDebounce: not implemented');
}
