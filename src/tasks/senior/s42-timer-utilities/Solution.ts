import type { FakeClock, PausableInterval, SleepOptions, TimeoutId, TimerCallback } from './types';

// ⬇ Delete this line when you start. Tests for this task are skipped while it exists.
export const NOT_STARTED = true;

export function sleep(ms: number, options: SleepOptions = {}): Promise<void> {
  // Your implementation here. Requirements are in README.md.
  void ms;
  void options;
  throw new Error('sleep: not implemented');
}

export function mySetInterval(fn: () => void, ms: number): number {
  void fn;
  void ms;
  throw new Error('mySetInterval: not implemented');
}

export function myClearInterval(id: number | undefined): void {
  void id;
  throw new Error('myClearInterval: not implemented');
}

export function createPausableInterval(fn: () => void, ms: number): PausableInterval {
  void fn;
  void ms;
  throw new Error('createPausableInterval: not implemented');
}

export function trackedSetTimeout(fn: TimerCallback, ms?: number, ...args: unknown[]): TimeoutId {
  void fn;
  void ms;
  void args;
  throw new Error('trackedSetTimeout: not implemented');
}

export function trackedClearTimeout(id: TimeoutId | undefined): void {
  void id;
  throw new Error('trackedClearTimeout: not implemented');
}

export function clearAllTimeouts(): void {
  throw new Error('clearAllTimeouts: not implemented');
}

export function createFakeClock(startTime = 0): FakeClock {
  void startTime;
  throw new Error('createFakeClock: not implemented');
}
