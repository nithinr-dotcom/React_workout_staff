import type { DependencyList, EffectCallback, RefObject } from 'react';

export interface TimeoutControls {
  /** Cancels the pending timeout. Nothing fires until `reset()` is called or `delay` changes. */
  clear(): void;
  /** Cancels any pending timeout and starts a fresh one of `delay` ms (no-op while `delay` is `null`). */
  reset(): void;
}

export interface WindowSize {
  width: number;
  height: number;
}

/** A target itself, a ref to one, or nothing (no listener is attached). */
export type ListenerTarget = EventTarget | RefObject<EventTarget | null> | null | undefined;

export interface HooksModule {
  /** Calls the latest `callback` every `delay` ms. `null` pauses. */
  useInterval(callback: () => void, delay: number | null): void;

  /** Calls the latest `callback` once, `delay` ms after mount (or after `delay` changes). `null` pauses. */
  useTimeout(callback: () => void, delay: number | null): TimeoutControls;

  /** A copy of `value` that updates at most once every `ms` milliseconds (leading + trailing). */
  useThrottle<T>(value: T, ms: number): T;

  /** `window.innerWidth` / `window.innerHeight`, kept up to date on `resize`. */
  useWindowSize(): WindowSize;

  /** Whether `window.matchMedia(query)` currently matches. */
  useMediaQuery(query: string): boolean;

  /** Whether the pointer is currently over `ref.current`. */
  useHover<E extends HTMLElement>(ref: RefObject<E | null>): boolean;

  /** Subscribes `handler` to `type` events on `target`; always calls the latest handler. */
  useEventListener<E extends Event = Event>(
    target: ListenerTarget,
    type: string,
    handler: (event: E) => void,
    options?: boolean | AddEventListenerOptions,
  ): void;

  /** `true` during the first render of the component, `false` afterwards. */
  useIsFirstRender(): boolean;

  /** Like `useEffect`, but skips the initial mount. */
  useUpdateEffect(effect: EffectCallback, deps?: DependencyList): void;

  /** Follow-up 1: `true` once there has been no user activity for `ms` milliseconds. */
  useIdle(ms: number): boolean;
}
