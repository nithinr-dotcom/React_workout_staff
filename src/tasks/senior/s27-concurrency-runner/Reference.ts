import type { AddOptions, Queue, QueueOptions, Task } from './types';

const isValidLimit = (n: number) => n === Infinity || (Number.isInteger(n) && n >= 1);

const abortError = () => new DOMException('The operation was aborted.', 'AbortError');

/* ---------- mapAsyncLimit ---------- */

export function mapAsyncLimit<T, R>(
  items: Iterable<T>,
  limit: number,
  fn: (item: T, index: number) => R | PromiseLike<R>,
): Promise<R[]> {
  return new Promise<R[]>((resolve, reject) => {
    // Throwing inside the executor rejects the promise.
    if (!isValidLimit(limit)) throw new RangeError(`limit must be an integer >= 1 or Infinity, got ${limit}`);

    const list = Array.from(items);
    const results = new Array<R>(list.length);
    let nextIndex = 0;
    let inFlight = 0;
    let completed = 0;
    let failed = false;

    if (list.length === 0) {
      resolve(results);
      return;
    }

    // Fill every free slot. Each settle calls this again, so the next item starts as soon as a slot frees up.
    const fillSlots = () => {
      while (!failed && inFlight < limit && nextIndex < list.length) {
        const index = nextIndex++;
        inFlight++;
        // Wrapping the call in `new Promise` turns a synchronous throw from fn into a rejection.
        new Promise<R>((res) => res(fn(list[index], index))).then(
          (value) => {
            inFlight--;
            results[index] = value;
            completed++;
            if (completed === list.length) resolve(results);
            else fillSlots();
          },
          (error: unknown) => {
            inFlight--;
            // Only the first error matters. Later settles hit an already-rejected promise and are ignored.
            failed = true;
            reject(error);
          },
        );
      }
    };

    fillSlots();
  });
}

/* ---------- createQueue ---------- */

interface Entry {
  priority: number;
  start: () => void;
  signal?: AbortSignal;
  onAbort?: () => void;
}

export function createQueue({ concurrency }: QueueOptions): Queue {
  if (!isValidLimit(concurrency)) {
    throw new RangeError(`concurrency must be an integer >= 1 or Infinity, got ${concurrency}`);
  }

  // Sorted by priority (highest first). Equal priorities keep insertion order, so the default case is plain FIFO.
  const waiting: Entry[] = [];
  let running = 0;
  let paused = false;
  let idleWaiters: (() => void)[] = [];

  const notifyIfIdle = () => {
    if (waiting.length > 0 || running > 0 || idleWaiters.length === 0) return;
    const waiters = idleWaiters;
    idleWaiters = [];
    waiters.forEach((resolve) => resolve());
  };

  const pump = () => {
    while (!paused && running < concurrency && waiting.length > 0) {
      const entry = waiting.shift()!;
      if (entry.onAbort) entry.signal?.removeEventListener('abort', entry.onAbort);
      entry.start();
    }
    notifyIfIdle();
  };

  const enqueue = (entry: Entry) => {
    // Binary search for the first entry with a strictly lower priority, so we insert after equal priorities.
    let lo = 0;
    let hi = waiting.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (waiting[mid].priority >= entry.priority) lo = mid + 1;
      else hi = mid;
    }
    waiting.splice(lo, 0, entry);
  };

  function add<T>(task: Task<T>, { priority = 0, retries = 0, signal }: AddOptions = {}): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      if (signal?.aborted) {
        reject(abortError());
        return;
      }

      const runWithRetries = async (): Promise<T> => {
        let lastError: unknown;
        for (let attempt = 0; attempt <= retries; attempt++) {
          try {
            return await task({ signal });
          } catch (error) {
            lastError = error;
            if (signal?.aborted) break;
          }
        }
        throw lastError;
      };

      const entry: Entry = {
        priority,
        signal,
        start: () => {
          running++;
          runWithRetries()
            .then(resolve, reject)
            .finally(() => {
              running--;
              pump();
            });
        },
      };

      if (signal) {
        entry.onAbort = () => {
          const index = waiting.indexOf(entry);
          if (index === -1) return; // already started; the task observes the signal itself
          waiting.splice(index, 1);
          reject(abortError());
          notifyIfIdle();
        };
        signal.addEventListener('abort', entry.onAbort, { once: true });
      }

      enqueue(entry);
      pump();
    });
  }

  return {
    add,
    pause() {
      paused = true;
    },
    resume() {
      if (!paused) return;
      paused = false;
      pump();
    },
    onIdle() {
      if (waiting.length === 0 && running === 0) return Promise.resolve();
      return new Promise<void>((resolve) => idleWaiters.push(resolve));
    },
    get size() {
      return waiting.length;
    },
    get pending() {
      return running;
    },
    get isPaused() {
      return paused;
    },
  };
}
