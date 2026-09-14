import type { DebounceOptions, Debounced } from './types';

export function debounce<Args extends unknown[]>(
  fn: (...args: Args) => void,
  wait: number,
  { leading = false, trailing = true, maxWait }: DebounceOptions = {},
): Debounced<Args> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let maxTimer: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: Args | null = null;
  let lastThis: unknown = null;
  let callsInBurst = 0;

  const invoke = () => {
    const args = lastArgs!;
    const thisArg = lastThis;
    lastArgs = null;
    lastThis = null;
    fn.apply(thisArg, args);
  };

  const clearTimers = () => {
    if (timer) clearTimeout(timer);
    if (maxTimer) clearTimeout(maxTimer);
    timer = null;
    maxTimer = null;
  };

  // End of a quiet period: run the trailing call if it wasn't already consumed by the leading call.
  const onQuiet = () => {
    const shouldRunTrailing = trailing && lastArgs !== null && !(leading && callsInBurst === 1);
    clearTimers();
    callsInBurst = 0;
    if (shouldRunTrailing) invoke();
    lastArgs = null;
  };

  // maxWait elapsed during continuous calls: run now and start a new max window.
  const onMaxWait = () => {
    maxTimer = null;
    if (lastArgs !== null) {
      invoke();
      callsInBurst = 0;
      if (timer !== null && maxWait !== undefined) maxTimer = setTimeout(onMaxWait, maxWait);
    }
  };

  function debounced(this: unknown, ...args: Args) {
    lastArgs = args;
    lastThis = this;
    callsInBurst++;

    const isFirstInBurst = timer === null;
    if (timer) clearTimeout(timer);
    timer = setTimeout(onQuiet, wait);

    if (isFirstInBurst) {
      if (maxWait !== undefined) maxTimer = setTimeout(onMaxWait, maxWait);
      if (leading) invoke();
    }
  }

  debounced.cancel = () => {
    clearTimers();
    lastArgs = null;
    lastThis = null;
    callsInBurst = 0;
  };

  debounced.flush = () => {
    if (timer === null) return;
    const hasPending = lastArgs !== null;
    clearTimers();
    callsInBurst = 0;
    if (hasPending) invoke();
  };

  debounced.pending = () => timer !== null;

  return debounced;
}
