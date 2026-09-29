import type { Throttled, ThrottleOptions } from "./types";

export function throttle<Args extends unknown[]>(
  fn: (...args: Args) => void,
  wait: number,
  options: ThrottleOptions = {},
): Throttled<Args> {
  const { leading = true, trailing = true } = options;

  // 1. CLOSURE STATE, private to this throttled function.
  //    `timer !== undefined` means "a window is open". There is no separate flag,
  //    so the state can't get out of sync.
  let timer: ReturnType<typeof setTimeout> | undefined;
  let lastArgs: Args | undefined; // remembered trailing call (undefined = none)
  let lastThis: unknown;

  // 2. Run the remembered call. Args are cleared BEFORE `fn` runs, so a
  //    re-entrant call from inside `fn` is remembered as a fresh trailing call.
  const invoke = () => {
    const args = lastArgs as Args;
    const ctx = lastThis;
    lastArgs = undefined;
    lastThis = undefined;
    fn.apply(ctx, args);
  };

  // 3. The window ended. If a call was remembered, run it and open a NEW window,
  //    because every run of `fn` counts: two runs are never less than `wait` apart.
  //    If nothing was remembered, go idle (no timer left) so the next call is leading.
  //    The new window opens BEFORE `fn` runs, so even if `fn` throws the throttle
  //    is still in a valid state and keeps working.
  const onWindowEnd = () => {
    timer = undefined;
    if (lastArgs) {
      timer = setTimeout(onWindowEnd, wait);
      invoke();
    }
  };

  // 4. A normal `function` so the caller's `this` is kept:
  //    `obj.onScroll = throttle(obj.onScroll, 100); obj.onScroll()` → `this === obj`.
  function throttled(this: unknown, ...args: Args) {
    // 5. Remember the LATEST call. With trailing: false we never remember anything,
    //    so calls during an open window are simply dropped.
    if (trailing) {
      lastArgs = args;
      lastThis = this;
    }

    if (timer !== undefined) return; // window open → just remember (done above)

    // 6. No window open: this call starts one.
    timer = setTimeout(onWindowEnd, wait);
    if (leading) {
      // Leading edge: run right away. Set args here too, for the trailing: false case.
      lastArgs = args;
      lastThis = this;
      invoke(); // clears lastArgs → a single isolated call runs only once
    }
    // leading: false → the remembered call runs when the window ends.
    // (leading: false AND trailing: false → `fn` never runs, by definition.)
  }

  // 7. cancel: forget the remembered call and close the window.
  //    No timer is left, and the next call behaves like a first (leading) call.
  throttled.cancel = () => {
    clearTimeout(timer);
    timer = undefined;
    lastArgs = undefined;
    lastThis = undefined;
  };

  // 8. Follow-up 1: run the remembered call now and reset the window.
  //    With nothing remembered it does nothing (the current window stays as it is).
  throttled.flush = () => {
    if (!lastArgs) return;
    clearTimeout(timer);
    timer = undefined;
    invoke();
  };

  return throttled;
}
