export type TimerCallback = (...args: any[]) => void;

/** Whatever the global setTimeout returns (a number in browsers, an object in Node). */
export type TimeoutId = ReturnType<typeof setTimeout>;

export interface SleepOptions {
  signal?: AbortSignal;
}

export interface PausableInterval {
  /** Stops the ticking and remembers how much of the current period was left. No-op while paused or cleared. */
  pause(): void;
  /** Continues ticking: the next call happens after the remembered remaining time. No-op unless paused. */
  resume(): void;
  /** Stops for good. `resume()` afterwards does nothing. */
  clear(): void;
}

export interface FakeClock {
  /** Schedules `fn(...args)` to run once when the clock reaches `now() + ms`. Returns a unique positive id. */
  setTimeout(fn: TimerCallback, ms?: number, ...args: unknown[]): number;
  /** Cancels a pending timer. Unknown or already-run ids are a no-op. */
  clearTimeout(id: number | undefined): void;
  /** The clock's current time in ms. Starts at `startTime` (default 0). */
  now(): number;
  /** Moves the clock forward by `ms`, running every timer that becomes due, in time order. */
  tick(ms: number): void;

  /** Follow-up 1 */
  setInterval(fn: TimerCallback, ms: number, ...args: unknown[]): number;
  /** Follow-up 1 */
  clearInterval(id: number | undefined): void;
  /** Follow-up 2: runs timers until none are left. Returns how many ran. */
  runAll(): number;
}

export interface TimerUtilitiesModule {
  /** Resolves after `ms`. Rejects with a DOMException named "AbortError" if the signal aborts first. */
  sleep(ms: number, options?: SleepOptions): Promise<void>;
  /** Calls `fn` every `ms`, built only on setTimeout, without drift. Returns an id for myClearInterval. */
  mySetInterval(fn: () => void, ms: number): number;
  /** Stops an interval started by mySetInterval. Unknown ids are a no-op. */
  myClearInterval(id: number | undefined): void;
  /** An interval that starts immediately and can be paused and resumed without losing its place in the period. */
  createPausableInterval(fn: () => void, ms: number): PausableInterval;
  /** Behaves like the global setTimeout, but remembers the timeout so clearAllTimeouts can cancel it. */
  trackedSetTimeout(fn: TimerCallback, ms?: number, ...args: unknown[]): TimeoutId;
  /** Behaves like the global clearTimeout for ids returned by trackedSetTimeout. */
  trackedClearTimeout(id: TimeoutId | undefined): void;
  /** Cancels every pending timeout created with trackedSetTimeout. */
  clearAllTimeouts(): void;
  /** A deterministic, manually advanced clock. */
  createFakeClock(startTime?: number): FakeClock;
}
