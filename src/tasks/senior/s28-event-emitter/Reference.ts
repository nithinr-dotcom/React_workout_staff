import type { IEventEmitter, Listener, WaitForOptions } from './types';

/**
 * Each `on`/`once` call creates its own registration object. That makes duplicates, "remove exactly
 * this subscription" and once-bookkeeping straightforward: unsubscribe removes by object identity,
 * while `off(event, fn)` searches by the listener function.
 */
interface Registration {
  listener: Listener;
  once: boolean;
  /** Set when a once-listener has run, so a stale snapshot can't call it a second time. */
  fired: boolean;
}

const WILDCARD = '*';

export class EventEmitter implements IEventEmitter {
  // A Map avoids prototype keys: 'constructor', '__proto__' and 'toString' are ordinary event names here.
  #events = new Map<string, Registration[]>();

  on(event: string, listener: Listener): () => void {
    return this.#add(event, listener, false);
  }

  once(event: string, listener: Listener): () => void {
    return this.#add(event, listener, true);
  }

  off(event: string, listener: Listener): void {
    const list = this.#events.get(event);
    if (!list) return;
    // Like Node: remove the most recently added matching registration.
    for (let i = list.length - 1; i >= 0; i--) {
      if (list[i].listener === listener) {
        this.#removeAt(event, list, i);
        return;
      }
    }
  }

  emit(event: string, ...args: unknown[]): boolean {
    const named = this.#events.get(event);
    const wildcard = event === WILDCARD ? undefined : this.#events.get(WILDCARD);

    if (event === 'error' && !named) {
      const [err] = args;
      throw err instanceof Error ? err : new Error('Unhandled error event');
    }

    if (!named && !wildcard) return false;

    // Snapshot first. Listeners added or removed during this emit don't change who gets called now.
    if (named) this.#dispatch(event, [...named], args);
    if (wildcard) this.#dispatch(WILDCARD, [...wildcard], [event, ...args]);
    return true;
  }

  listenerCount(event: string): number {
    return this.#events.get(event)?.length ?? 0;
  }

  removeAllListeners(event?: string): void {
    if (event === undefined) this.#events.clear();
    else this.#events.delete(event);
  }

  waitFor(event: string, { signal }: WaitForOptions = {}): Promise<unknown[]> {
    return new Promise((resolve, reject) => {
      if (signal?.aborted) {
        reject(new DOMException('The operation was aborted.', 'AbortError'));
        return;
      }
      const onAbort = () => {
        unsubscribe();
        reject(new DOMException('The operation was aborted.', 'AbortError'));
      };
      const unsubscribe = this.once(event, (...args: unknown[]) => {
        signal?.removeEventListener('abort', onAbort);
        resolve(args);
      });
      signal?.addEventListener('abort', onAbort, { once: true });
    });
  }

  /* ---------- internals ---------- */

  #add(event: string, listener: Listener, once: boolean): () => void {
    const registration: Registration = { listener, once, fired: false };
    const list = this.#events.get(event);
    if (list) list.push(registration);
    else this.#events.set(event, [registration]);

    return () => {
      const current = this.#events.get(event);
      if (!current) return;
      const index = current.indexOf(registration);
      if (index !== -1) this.#removeAt(event, current, index);
    };
  }

  #removeAt(event: string, list: Registration[], index: number) {
    list.splice(index, 1);
    if (list.length === 0 && this.#events.get(event) === list) this.#events.delete(event);
  }

  #dispatch(event: string, snapshot: Registration[], args: unknown[]) {
    for (const registration of snapshot) {
      if (registration.once) {
        if (registration.fired) continue;
        registration.fired = true;
        // Remove before calling so a re-entrant emit of the same event can't call it again.
        const list = this.#events.get(event);
        const index = list ? list.indexOf(registration) : -1;
        if (list && index !== -1) this.#removeAt(event, list, index);
      }
      registration.listener.apply(this, args);
    }
  }
}
