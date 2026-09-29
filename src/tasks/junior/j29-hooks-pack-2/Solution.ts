import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type DependencyList,
  type EffectCallback,
  type RefObject,
} from "react";
import type { ListenerTarget, TimeoutControls, WindowSize } from "./types";

// ---------- shared helper ----------

/**
 * The "latest ref" pattern. Timers and listeners are created once, so a plain
 * closure would keep calling the callback from the render that created them
 * (a stale closure). Instead they call `ref.current`, which we refresh after
 * every render. The ref object itself never changes, so it is safe in deps.
 */
function useLatest<T>(value: T) {
  const ref = useRef(value);
  // Layout effect: runs right after the DOM commit, before any timer or event
  // can fire, so nothing ever sees an old value.
  useLayoutEffect(() => {
    ref.current = value;
  });
  return ref;
}

// ---------- useInterval ----------

export function useInterval(callback: () => void, delay: number | null): void {
  const callbackRef = useLatest(callback);

  // 1. Only `delay` restarts the interval. A new callback identity (e.g. an
  //    inline arrow that sets state) does NOT, because we go through the ref.
  // 2. `null` means paused: schedule nothing. Coming back to a number runs the
  //    effect again, which starts a fresh interval.
  useEffect(() => {
    if (delay === null) return;
    const id = setInterval(() => callbackRef.current(), delay);
    return () => clearInterval(id); // on delay change and on unmount
  }, [delay, callbackRef]);
}

// ---------- useTimeout ----------

export function useTimeout(callback: () => void, delay: number | null): TimeoutControls {
  const callbackRef = useLatest(callback);
  // 1. `reset` must be stable but still use the current delay, so delay is
  //    read from a ref too.
  const delayRef = useLatest(delay);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clear = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    clear();
    const ms = delayRef.current;
    if (ms === null) return;
    timerRef.current = setTimeout(() => {
      // 2. Forget the id BEFORE calling back, so a reset() made inside the
      //    callback schedules a new timeout instead of being wiped out.
      timerRef.current = null;
      callbackRef.current();
    }, ms);
  }, [clear, delayRef, callbackRef]);

  // 3. Start on mount and again whenever `delay` changes. `delay` is listed
  //    on purpose: reset() reads it from the ref, but the effect must re-run.
  useEffect(() => {
    reset();
    return clear;
  }, [delay, reset, clear]);

  // 4. Same object while clear/reset are the same, so callers can use it in deps.
  return useMemo(() => ({ clear, reset }), [clear, reset]);
}

// ---------- useThrottle ----------

export function useThrottle<T>(value: T, ms: number): T {
  const [throttled, setThrottled] = useState(value);
  // Time of the last update we let through. 0 = "long ago", so the mount
  // effect lets the initial value through and opens the first window.
  const lastUpdateRef = useRef(0);

  useEffect(() => {
    const elapsed = Date.now() - lastUpdateRef.current;

    // 1. Leading edge: quiet for at least `ms`, so show the value right away.
    if (elapsed >= ms) {
      lastUpdateRef.current = Date.now();
      setThrottled(value); // same value → React skips the re-render
      return;
    }

    // 2. Trailing edge: inside a window, wait until it ends. Every new value
    //    cancels the old timer (cleanup below), so only the LATEST one lands.
    const id = setTimeout(() => {
      lastUpdateRef.current = Date.now();
      setThrottled(value);
    }, ms - elapsed);
    return () => clearTimeout(id);
  }, [value, ms]);

  return throttled;
}

// ---------- useEventListener ----------

function isRef(target: ListenerTarget): target is RefObject<EventTarget | null> {
  return typeof target === "object" && target !== null && "current" in target;
}

// Only `capture` decides which listener removeEventListener removes. The other
// flags still matter for adding, so they're all part of the key.
function optionsKey(options?: boolean | AddEventListenerOptions) {
  if (typeof options !== "object") return String(Boolean(options));
  return `${Boolean(options.capture)}|${Boolean(options.passive)}|${Boolean(options.once)}`;
}

export function useEventListener<E extends Event = Event>(
  target: ListenerTarget,
  type: string,
  handler: (event: E) => void,
  options?: boolean | AddEventListenerOptions,
): void {
  const handlerRef = useLatest(handler);
  // What we are subscribed to right now, and how to undo it.
  const subRef = useRef<{ element: EventTarget; key: string; remove: () => void } | null>(null);

  // 1. No deps on purpose: a ref's `.current` can change without the ref
  //    changing (e.g. an element that only appears after a conditional render),
  //    and deps can't see that. So we check after every render, but only
  //    re-subscribe when the element, type or options really changed.
  useEffect(() => {
    const element = isRef(target) ? target.current : target;
    const key = `${type}|${optionsKey(options)}`;
    const sub = subRef.current;
    if (sub && sub.element === element && sub.key === key) return; // nothing changed

    sub?.remove();
    subRef.current = null;
    if (!element) return; // null / undefined target → attach nothing

    // 2. The real listener never changes; it forwards to the latest handler.
    //    So a new handler identity doesn't remove and re-add anything.
    const listener = (event: Event) => handlerRef.current(event as E);
    element.addEventListener(type, listener, options);
    subRef.current = {
      element,
      key,
      remove: () => element.removeEventListener(type, listener, options),
    };
  });

  // 3. Remove the listener on unmount. (Under StrictMode this runs between the
  //    two mounts; the effect above then sees no subscription and adds it again.)
  useEffect(
    () => () => {
      subRef.current?.remove();
      subRef.current = null;
    },
    [],
  );
}

// ---------- useWindowSize ----------

function readWindowSize(): WindowSize {
  // SSR guard: there is no window on the server.
  if (typeof window === "undefined") return { width: 0, height: 0 };
  return { width: window.innerWidth, height: window.innerHeight };
}

export function useWindowSize(): WindowSize {
  // Lazy initialiser: read the window once, on the first render only.
  const [size, setSize] = useState(readWindowSize);
  useEventListener(typeof window === "undefined" ? null : window, "resize", () => setSize(readWindowSize()));
  return size;
}

// ---------- useMediaQuery ----------

function canMatchMedia() {
  return typeof window !== "undefined" && typeof window.matchMedia === "function";
}

export function useMediaQuery(query: string): boolean {
  // 1. useSyncExternalStore is React's built-in tool for "subscribe to
  //    something outside React". It re-subscribes when `subscribe` changes
  //    (i.e. when the query changes) and always reads a fresh value.
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (!canMatchMedia()) return () => {};
      const list = window.matchMedia(query);
      // 2. Older Safari only has the legacy addListener / removeListener.
      if (typeof list.addEventListener === "function") {
        list.addEventListener("change", onChange);
        return () => list.removeEventListener("change", onChange);
      }
      list.addListener(onChange);
      return () => list.removeListener(onChange);
    },
    [query],
  );

  const getSnapshot = () => (canMatchMedia() ? window.matchMedia(query).matches : false);
  // 3. Third argument = the value used during server rendering.
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

// ---------- useHover ----------

export function useHover<E extends HTMLElement>(ref: RefObject<E | null>): boolean {
  const [hovered, setHovered] = useState(false);

  // 1. pointerenter/leave (like mouseenter/leave) don't bubble and ignore moves
  //    between children, so hovering a child still counts as "over the element".
  useEventListener(ref, "pointerenter", () => setHovered(true));
  useEventListener(ref, "pointerleave", () => setHovered(false));

  // 2. Known limit: if the element is removed while hovered, no leave event
  //    ever fires, so this stays true until the pointer enters and leaves again.

  return hovered;
}

// ---------- useIsFirstRender ----------

export function useIsFirstRender(): boolean {
  const isFirstRef = useRef(true);
  // Flip the flag after the first commit instead of during render. Render
  // should stay pure: under StrictMode React calls it twice, and flipping it
  // there would make the second call already say "false".
  useEffect(() => {
    isFirstRef.current = false;
  }, []);
  return isFirstRef.current;
}

// ---------- useUpdateEffect ----------

function depsChanged(prev: DependencyList | undefined, next: DependencyList | undefined) {
  // No deps at all means "after every render", just like useEffect.
  if (!prev || !next || prev.length !== next.length) return true;
  // Same comparison React uses for deps: Object.is on each item.
  return next.some((dep, i) => !Object.is(dep, prev[i]));
}

export function useUpdateEffect(effect: EffectCallback, deps?: DependencyList): void {
  const effectRef = useLatest(effect);
  const mountedRef = useRef(false);
  const prevDepsRef = useRef(deps);
  const cleanupRef = useRef<ReturnType<EffectCallback>>(undefined);

  // 1. Why not just `useEffect(..., deps)`? Passing a deps array we got from
  //    the caller can't be checked by the linter. Instead we run after every
  //    commit and compare the deps ourselves.
  useEffect(() => {
    const prev = prevDepsRef.current;
    prevDepsRef.current = deps;
    // 2. Skip the mount. The flag lives in a ref, so StrictMode's second mount
    //    sees "already mounted" with unchanged deps and still skips.
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    if (!depsChanged(prev, deps)) return;

    // 3. Like useEffect: clean up the previous run before the next one.
    cleanupRef.current?.();
    cleanupRef.current = effectRef.current();
  });

  // 4. ...and clean up the last run on unmount.
  useEffect(
    () => () => {
      cleanupRef.current?.();
      cleanupRef.current = undefined;
    },
    [],
  );
}

// ---------- follow-up 1: useIdle ----------

const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "touchstart", "wheel", "scroll"] as const;

export function useIdle(ms: number): boolean {
  const [idle, setIdle] = useState(false);

  useEffect(() => {
    let timer = setTimeout(() => setIdle(true), ms);

    const onActivity = () => {
      // 1. setIdle(false) while already false is a no-op for React (same
      //    value → no re-render), so a stream of mousemoves only restarts a
      //    timer. That's cheap, and nothing re-renders until the state flips.
      setIdle(false);
      clearTimeout(timer);
      timer = setTimeout(() => setIdle(true), ms);
    };

    // 2. Capture phase on window: sees events from anywhere, including
    //    `scroll`, which doesn't bubble.
    const opts = { capture: true, passive: true };
    for (const type of ACTIVITY_EVENTS) window.addEventListener(type, onActivity, opts);
    return () => {
      clearTimeout(timer);
      for (const type of ACTIVITY_EVENTS) window.removeEventListener(type, onActivity, opts);
    };
  }, [ms]);

  return idle;
}
