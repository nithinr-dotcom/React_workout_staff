export type Listener = (...args: any[]) => void;

export interface WaitForOptions {
  signal?: AbortSignal;
}

export interface IEventEmitter {
  /** Register a listener. Returns a function that removes exactly this registration. */
  on(event: string, listener: Listener): () => void;
  /** Register a listener that runs at most once. Returns an unsubscribe function. */
  once(event: string, listener: Listener): () => void;
  /** Remove one registration of `listener` (the most recently added one). No-op if not registered. */
  off(event: string, listener: Listener): void;
  /** Call every listener for `event` synchronously, in registration order. Returns whether any existed. */
  emit(event: string, ...args: unknown[]): boolean;
  /** Number of registrations for `event`. */
  listenerCount(event: string): number;
  /** Remove all listeners for `event`, or for every event when called with no argument. */
  removeAllListeners(event?: string): void;
  /** Follow-up 3: resolves with the args array of the next `event`. */
  waitFor(event: string, options?: WaitForOptions): Promise<unknown[]>;
}

export interface EventEmitterModule {
  EventEmitter: new () => IEventEmitter;
}
