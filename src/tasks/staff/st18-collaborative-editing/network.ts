import type { Message, Network } from './types';

/**
 * Given infrastructure (not part of the exercise): an in-memory network with artificial latency.
 *
 * - Each message is delayed by roughly `getDelayMs()` (±50% jitter), read at send time,
 *   so moving the demo's slider affects the next messages.
 * - Each (from → to) link stays FIFO, like a WebSocket: a message never overtakes an earlier one on the same link.
 * - Messages on different links interleave freely, so concurrent edits really do cross in flight.
 */
export function createDelayedNetwork(getDelayMs: () => number): Network & { destroy(): void } {
  const handlers = new Map<string, (from: string, message: Message) => void>();
  const lastDeliveryAt = new Map<string, number>();
  const queues = new Map<string, Message[]>();
  const timers = new Set<ReturnType<typeof setTimeout>>();

  return {
    send(from, to, message) {
      const link = `${from}→${to}`;
      const base = Math.max(0, getDelayMs());
      const jittered = base === 0 ? 0 : base * (0.5 + Math.random());
      const at = Math.max(Date.now() + jittered, lastDeliveryAt.get(link) ?? 0);
      lastDeliveryAt.set(link, at);

      const queue = queues.get(link) ?? [];
      queues.set(link, queue);
      queue.push(structuredClone(message));

      // One timer per message; each firing delivers the head of the link's queue, so order is always FIFO.
      const timer = setTimeout(() => {
        timers.delete(timer);
        const next = queue.shift();
        if (next) handlers.get(to)?.(from, next);
      }, at - Date.now());
      timers.add(timer);
    },
    listen(id, handler) {
      handlers.set(id, handler);
      return () => {
        if (handlers.get(id) === handler) handlers.delete(id);
      };
    },
    destroy() {
      timers.forEach(clearTimeout);
      timers.clear();
      queues.clear();
      handlers.clear();
    },
  };
}
