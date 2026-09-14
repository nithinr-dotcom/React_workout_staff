# Hooks pack II

## Problem statement
Hook questions are the most common "small" React round: GreatFrontEnd lists over thirty of them, and BFE.dev's `useTimeout` and `useIsFirstRender` have been solved more than 12 000 times each. J25 covered state-ish hooks. This pack is about **time, the browser and effect timing**. Implement these nine hooks and export each one by name from `Solution.ts`:

| Hook | What it does |
|---|---|
| `useInterval(callback, delay)` | Calls `callback` every `delay` ms. `null` pauses. |
| `useTimeout(callback, delay)` | Calls `callback` once after `delay` ms. Returns `{ clear, reset }`. |
| `useThrottle(value, ms)` | A copy of a fast-changing value that updates at most once per `ms`. |
| `useWindowSize()` | `{ width, height }` of the window, updated on resize. |
| `useMediaQuery(query)` | Whether a CSS media query matches, updated live. |
| `useHover(ref)` | Whether the pointer is over an element. |
| `useEventListener(target, type, handler, options?)` | A declarative `addEventListener` with cleanup. |
| `useIsFirstRender()` | `true` only on the first render. |
| `useUpdateEffect(effect, deps)` | `useEffect` that skips the mount. |

The classic mistakes here are timers restarted on every render because the callback changed identity, stale closures that call an old callback, listeners that are never removed, and code that touches `window` during render and breaks on the server.

## Clarifying questions to ask
- If `callback` changes identity on every render, should the interval or timeout restart? *(No. Always call the latest callback, and keep the timer running.)*
- What does a `null` delay mean? *(Paused: nothing is scheduled. Switching back to a number starts a fresh timer.)*
- If `delay` changes from one number to another, what happens? *(The timer restarts with the new delay.)*
- Does `useTimeout`'s `reset()` work after the timeout has already fired or been cleared? *(Yes. It always schedules a fresh timeout, unless `delay` is `null`.)*
- Should `clear` and `reset` keep the same identity across renders? *(Yes.)*
- For `useThrottle`, is it leading, trailing or both? *(Both, like J24: a change after a quiet period shows up immediately, and the latest value inside a window shows up when the window ends. The initial value counts as an update and opens a window. That last part isn't tested.)*
- What should `useWindowSize` and `useMediaQuery` return during server rendering, when there is no `window`? *(`{ width: 0, height: 0 }` and `false`. Not tested in jsdom, but your code must not touch `window` at module scope or crash without it.)*
- Which events does `useHover` use? *(Your choice of `mouseenter`/`mouseleave` or `pointerenter`/`pointerleave`. Tests use `userEvent.hover`, which fires both.)*
- Can `useEventListener` take a ref as the target? *(Yes: a target, a ref to one, or `null`/`undefined` to attach nothing.)*

## Functional requirements
### useInterval
- [ ] Calls `callback` every `delay` ms while mounted.
- [ ] Always calls the **latest** `callback`. Re-rendering with a new callback does **not** restart the interval.
- [ ] `delay = null` pauses: nothing runs. Switching back to a number resumes with a fresh interval.
- [ ] Changing `delay` to a different number restarts the interval with the new delay.
- [ ] Clears the interval on unmount.

### useTimeout
- [ ] Calls `callback` once, `delay` ms after mount.
- [ ] Always calls the latest `callback` without restarting the countdown.
- [ ] `delay = null` schedules nothing. Changing `delay` starts a fresh countdown.
- [ ] Returns `{ clear, reset }`. `clear()` cancels the pending call. `reset()` cancels it and starts a new `delay` ms countdown, including after the timeout fired or was cleared.
- [ ] `clear` and `reset` have the same identity on every render.
- [ ] Clears the timeout on unmount.

### useThrottle
- [ ] Returns the initial value on the first render.
- [ ] A change that arrives when at least `ms` has passed since the last update is returned immediately.
- [ ] Changes that arrive inside a window are not returned right away. When the window ends (`ms` after the last update), the **latest** value is returned.
- [ ] If nothing changed inside the window, no extra update happens.
- [ ] Clears any pending timer on unmount.

### useWindowSize
- [ ] Returns `{ width: window.innerWidth, height: window.innerHeight }` on the first render.
- [ ] Updates after a `resize` event on `window`.
- [ ] Removes its listener on unmount.
- [ ] SSR-safe: returns `{ width: 0, height: 0 }` when `window` is undefined.

### useMediaQuery
- [ ] Returns `window.matchMedia(query).matches` on the first render.
- [ ] Updates when the media query list fires `change`.
- [ ] When `query` changes, unsubscribes from the old list, subscribes to the new one and returns its current value.
- [ ] Removes its listener on unmount.
- [ ] SSR-safe: returns `false` when `window` or `matchMedia` is missing.

### useHover
- [ ] Returns `false` initially.
- [ ] Returns `true` while the pointer is over `ref.current` (including its children) and `false` after it leaves.
- [ ] Does nothing while `ref.current` is `null`.
- [ ] Removes its listeners on unmount.

### useEventListener
- [ ] Attaches `handler` for `type` on `target`, or on `target.current` when given a ref. Passes `options` through.
- [ ] Does nothing when the target is `null` or `undefined`.
- [ ] Always calls the latest `handler`. Re-rendering with a new handler does **not** remove and re-add the listener.
- [ ] Re-subscribes when `target` or `type` changes.
- [ ] Removes the listener on unmount.

### useIsFirstRender
- [ ] Returns `true` during the first render and `false` on every later render.

### useUpdateEffect
- [ ] Does **not** run `effect` on mount.
- [ ] Runs `effect` after a render in which a dependency changed, just like `useEffect`.
- [ ] Runs the cleanup that `effect` returned before the next run and on unmount.

## Non-functional requirements
- Rules of Hooks and honest dependency arrays. No `eslint-disable` for `exhaustive-deps`.
- No leaks: every timer and listener is cleaned up.
- No needless re-subscriptions: a new callback or handler identity must not restart timers or re-attach listeners.
- SSR-safe: nothing reads `window`, `document` or `matchMedia` at module scope or unguarded during render.
- Typed as in `types.ts`.

## Constraints
- 45 minutes for all nine. React only, no hook libraries.
- You may build hooks on top of each other, e.g. `useWindowSize` on `useEventListener`.
- Keep the signatures in `types.ts`.

## Data / API contract
```ts
interface TimeoutControls { clear(): void; reset(): void }
interface WindowSize { width: number; height: number }
type ListenerTarget = EventTarget | RefObject<EventTarget | null> | null | undefined;

function useInterval(callback: () => void, delay: number | null): void;
function useTimeout(callback: () => void, delay: number | null): TimeoutControls;
function useThrottle<T>(value: T, ms: number): T;
function useWindowSize(): WindowSize;
function useMediaQuery(query: string): boolean;
function useHover<E extends HTMLElement>(ref: RefObject<E | null>): boolean;
function useEventListener<E extends Event = Event>(
  target: ListenerTarget,
  type: string,
  handler: (event: E) => void,
  options?: boolean | AddEventListenerOptions,
): void;
function useIsFirstRender(): boolean;
function useUpdateEffect(effect: EffectCallback, deps?: DependencyList): void;
function useIdle(ms: number): boolean; // follow-up 1
```

## Test contract
- Hooks are imported as named exports and tested with `renderHook`, `render` and `act` from `@testing-library/react`.
- Timer hooks use `vi.useFakeTimers()` (which also fakes `Date.now()`) and advance time inside `act`.
- `useWindowSize` tests set `window.innerWidth`/`innerHeight` and dispatch `new Event('resize')` on `window`. Listener cleanup is checked by spying on `window.addEventListener`/`removeEventListener`: every `resize` listener added must be removed on unmount.
- `useMediaQuery` tests replace `window.matchMedia` with a stub. It returns one list object per query, with `matches`, `media`, `addEventListener`/`removeEventListener` **and** the legacy `addListener`/`removeListener`. A change calls the listeners with `{ matches, media }`. Cleanup is checked by the stub having no listeners left.
- `useHover` is tested in a component whose ref is on a region containing a button named `Target`, next to a button named `Elsewhere`. It uses `userEvent.hover` / `userEvent.unhover` and renders the hook's value as the text `hovered: true` / `hovered: false`.
- `useEventListener` tests dispatch events on `window` and on an element held in a ref. "No re-subscribe" is checked by counting `addEventListener` calls for that event type across re-renders.
- Follow-up 1 fires `keydown` on `document.body` (it bubbles to `document` and `window`) as the activity.

## Edge cases
- `useInterval` with a callback that sets state: the new render must not reset the interval.
- `useTimeout` where `reset()` is called from inside the callback itself.
- `delay = 0` still runs asynchronously.
- `useThrottle` receiving the same value again: no extra update is needed.
- `useMediaQuery` in older Safari, where `MediaQueryList` only has `addListener`.
- `useHover` when the element is removed while hovered: no `leave` event fires.
- `useEventListener` with a ref whose `.current` is only set after a conditional render.
- `useUpdateEffect` and `useIsFirstRender` under `<StrictMode>`, where effects mount, unmount and mount again in development.

## Follow-ups
1. **useIdle(ms).** Return `true` once there has been no user activity (`mousemove`, `mousedown`, `keydown`, `touchstart`, `wheel`, `scroll`) for `ms` milliseconds, and `false` again as soon as activity happens. Start as `false`. How would you avoid re-rendering on every `mousemove`?
2. **SSR without hydration mismatches.** Rewrite `useMediaQuery` and `useWindowSize` with `useSyncExternalStore` and a `getServerSnapshot`. What does the user see during hydration, and why can reading `matchMedia` in a lazy `useState` initialiser cause a mismatch warning?
3. **StrictMode.** Your `useUpdateEffect` probably runs on mount under `<StrictMode>` in development. Explain why, and whether that is a bug worth fixing. What does the React team say `useIsFirstRender`-style refs are for?
4. **useCountdown.** Build `useCountdown(seconds)` returning `{ remaining, start, pause, reset }` on top of `useInterval`. Why does counting ticks drift when the tab is in the background, and how do timestamps fix it?
5. **Throttle options.** Add `{ leading, trailing }` options to `useThrottle`, and a `useThrottledCallback(fn, ms)` that returns a stable throttled function. When would you prefer one over the other?

## Concepts covered
The "latest ref" pattern · timers inside effects and their cleanup · pausing with `null` · subscribing to browser events and `MediaQueryList` · SSR guards · effect timing and skipping the mount · `renderHook` with fake timers.

Related: J25 Hooks pack · J23 debounce · J24 throttle · J07 Stopwatch & Countdown · S33 useFetch · ST07 Hooks from scratch.
