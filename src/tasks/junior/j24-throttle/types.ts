export interface ThrottleOptions {
  /** Invoke on the leading edge of a window. Default true. */
  leading?: boolean;
  /** Invoke on the trailing edge with the latest arguments. Default true. */
  trailing?: boolean;
}

export interface Throttled<Args extends unknown[]> {
  (...args: Args): void;
  /** Drop any pending trailing call and reset the window. */
  cancel(): void;
  /** Follow-up 1: run the pending trailing call now, if there is one. */
  flush(): void;
}

export interface ThrottleModule {
  throttle<Args extends unknown[]>(
    fn: (...args: Args) => void,
    wait: number,
    options?: ThrottleOptions,
  ): Throttled<Args>;
}
