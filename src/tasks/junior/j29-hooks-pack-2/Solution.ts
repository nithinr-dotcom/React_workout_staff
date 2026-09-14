import type { DependencyList, EffectCallback, RefObject } from 'react';
import type { ListenerTarget, TimeoutControls, WindowSize } from './types';

// ⬇ Delete this line when you start. Tests for this task are skipped while it exists.
export const NOT_STARTED = true;

// Your implementation here. Requirements are in README.md.

export function useInterval(callback: () => void, delay: number | null): void {
  void callback;
  void delay;
  throw new Error('useInterval: not implemented');
}

export function useTimeout(callback: () => void, delay: number | null): TimeoutControls {
  void callback;
  void delay;
  throw new Error('useTimeout: not implemented');
}

export function useThrottle<T>(value: T, ms: number): T {
  void value;
  void ms;
  throw new Error('useThrottle: not implemented');
}

export function useWindowSize(): WindowSize {
  throw new Error('useWindowSize: not implemented');
}

export function useMediaQuery(query: string): boolean {
  void query;
  throw new Error('useMediaQuery: not implemented');
}

export function useHover<E extends HTMLElement>(ref: RefObject<E | null>): boolean {
  void ref;
  throw new Error('useHover: not implemented');
}

export function useEventListener<E extends Event = Event>(
  target: ListenerTarget,
  type: string,
  handler: (event: E) => void,
  options?: boolean | AddEventListenerOptions,
): void {
  void target;
  void type;
  void handler;
  void options;
  throw new Error('useEventListener: not implemented');
}

export function useIsFirstRender(): boolean {
  throw new Error('useIsFirstRender: not implemented');
}

export function useUpdateEffect(effect: EffectCallback, deps?: DependencyList): void {
  void effect;
  void deps;
  throw new Error('useUpdateEffect: not implemented');
}

/** Follow-up 1. */
export function useIdle(ms: number): boolean {
  void ms;
  throw new Error('useIdle: not implemented');
}
