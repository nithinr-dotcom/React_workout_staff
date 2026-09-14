export interface StopwatchCountdownProps {
  /**
   * Monotonic clock in ms. Read ALL time through this function.
   * Default: () => performance.now(). Tests inject a fake clock.
   */
  now?: () => number;
  /** Called exactly once each time the countdown reaches zero. */
  onCountdownComplete?: () => void;
}
