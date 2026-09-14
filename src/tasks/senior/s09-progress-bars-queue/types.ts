export interface ProgressQueueProps {
  /** Running time (ms) for one bar to fill from 0% to 100%. Default 2000. */
  duration?: number;
  /** Maximum number of bars filling at the same time. Default 3. */
  concurrency?: number;
}
