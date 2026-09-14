export interface TaskContext {
  /** The signal passed to `add` (follow-up 3). `undefined` when none was given. */
  signal?: AbortSignal;
}

export type Task<T> = (context: TaskContext) => T | PromiseLike<T>;

export interface AddOptions {
  /** Follow-up 1: higher runs first. Default 0. Equal priorities run in insertion order. */
  priority?: number;
  /** Follow-up 2: how many extra attempts after a failure. Default 0. */
  retries?: number;
  /** Follow-up 3: abort a task that is still waiting, and let a running task observe cancellation. */
  signal?: AbortSignal;
}

export interface QueueOptions {
  /** Maximum number of tasks running at once. An integer >= 1, or Infinity. */
  concurrency: number;
}

export interface Queue {
  /** Schedule a task. The promise settles with the task's own outcome. */
  add<T>(task: Task<T>, options?: AddOptions): Promise<T>;
  /** Stop starting new tasks. Running tasks are unaffected. */
  pause(): void;
  /** Start tasks again, up to the concurrency limit. */
  resume(): void;
  /** Resolves once nothing is waiting and nothing is running. */
  onIdle(): Promise<void>;
  /** Number of tasks waiting to start. */
  readonly size: number;
  /** Number of tasks currently running. */
  readonly pending: number;
  readonly isPaused: boolean;
}

export interface ConcurrencyModule {
  mapAsyncLimit<T, R>(
    items: Iterable<T>,
    limit: number,
    fn: (item: T, index: number) => R | PromiseLike<R>,
  ): Promise<R[]>;
  createQueue(options: QueueOptions): Queue;
}
