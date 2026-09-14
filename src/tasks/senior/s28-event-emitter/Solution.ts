import type { IEventEmitter, Listener, WaitForOptions } from './types';

// ⬇ Delete this line when you start. Tests for this task are skipped while it exists.
export const NOT_STARTED = true;

export class EventEmitter implements IEventEmitter {
  // Your implementation here. Requirements are in README.md.

  on(event: string, listener: Listener): () => void {
    void event;
    void listener;
    throw new Error('EventEmitter.on: not implemented');
  }

  once(event: string, listener: Listener): () => void {
    void event;
    void listener;
    throw new Error('EventEmitter.once: not implemented');
  }

  off(event: string, listener: Listener): void {
    void event;
    void listener;
    throw new Error('EventEmitter.off: not implemented');
  }

  emit(event: string, ...args: unknown[]): boolean {
    void event;
    void args;
    throw new Error('EventEmitter.emit: not implemented');
  }

  listenerCount(event: string): number {
    void event;
    throw new Error('EventEmitter.listenerCount: not implemented');
  }

  removeAllListeners(event?: string): void {
    void event;
    throw new Error('EventEmitter.removeAllListeners: not implemented');
  }

  /** Follow-up 3 */
  waitFor(event: string, options?: WaitForOptions): Promise<unknown[]> {
    void event;
    void options;
    throw new Error('EventEmitter.waitFor: not implemented');
  }
}
