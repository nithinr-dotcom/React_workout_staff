import type { DebounceOptions, Debounced } from "./types";

type Timer = ReturnType<typeof setTimeout>;

export function debounce<Args extends unknown[]>(
  fn: (...args: Args) => void,
  wait: number,
  options: DebounceOptions = {},
): Debounced<Args> {
  const { leading = false, trailing = true, maxWait } = options;

  // 1. CLOSURE STATE: these variables live inside this call of `debounce`, so every
  //    debounced function gets its own copy. That's why two of them never share state.
  let timer: Timer | undefined; // the "quiet period" timer, restarted on every call
  let maxTimer: Timer | undefined; // follow-up 2: forces a call every `maxWait` ms
  let lastArgs: Args | undefined; // the latest call's arguments (undefined = nothing to run)
  let lastThis: unknown; // the latest call's `this`

  // 2. Run `fn` with the remembered `this` + arguments, then forget them.
  //    We clear them BEFORE calling `fn`, so a re-entrant call from inside `fn`
  //    starts fresh instead of seeing stale args.
  const invoke = () => {
    const args = lastArgs as Args;
    const ctx = lastThis;
    lastArgs = undefined;
    lastThis = undefined;
    fn.apply(ctx, args);
  };

  const clearTimers = () => {
    clearTimeout(timer);
    clearTimeout(maxTimer);
    timer = undefined;
    maxTimer = undefined;
  };

  // 3. The quiet period is over: run the trailing call (if there is one) and go idle.
  //    Timers are cleared first, so nothing leaks and `pending()` is already false inside `fn`.
  const onQuiet = () => {
    clearTimers();
    if (trailing && lastArgs) {
      invoke();
    } else {
      // trailing: false → drop whatever was remembered during the burst.
      lastArgs = undefined;
      lastThis = undefined;
    }
  };

  // 4. Follow-up 2: calls keep coming, but `maxWait` ms have passed since the burst
  //    started, so run now. The next call starts a new maxWait window.
  const onMaxWait = () => {
    maxTimer = undefined;
    if (lastArgs) invoke();
  };

  // 5. A normal `function` (not an arrow) so it receives the caller's `this`.
  //    `obj.save = debounce(obj.save, 100); obj.save()` → `this === obj` here.
  function debounced(this: unknown, ...args: Args) {
    const isFirstInBurst = timer === undefined;
    lastArgs = args;
    lastThis = this;

    // 6. THE KEY IDEA: every call throws away the old timer and starts a new one,
    //    so `fn` only runs once the calls stop for `wait` ms.
    //    Even `wait = 0` goes through setTimeout, so it is never synchronous.
    clearTimeout(timer);
    timer = setTimeout(onQuiet, wait);
    if (maxWait !== undefined && maxTimer === undefined) {
      maxTimer = setTimeout(onMaxWait, maxWait);
    }

    // 7. Follow-up 1: leading edge fires on the first call of a burst.
    //    The timer was started above, so later calls in the burst (even ones made
    //    from inside `fn`) are treated as part of the same burst.
    //    `invoke` clears lastArgs, so a burst of one call doesn't also run on the trailing edge.
    if (leading && isFirstInBurst) invoke();
  }

  debounced.cancel = () => {
    clearTimers();
    lastArgs = undefined;
    lastThis = undefined;
  };

  // 8. flush = "stop waiting, run it now". If nothing is scheduled it does nothing,
  //    and because it clears the timer, a second flush() in a row does nothing too.
  debounced.flush = () => {
    if (timer === undefined) return;
    onQuiet();
  };

  debounced.pending = () => timer !== undefined;

  return debounced;
}
