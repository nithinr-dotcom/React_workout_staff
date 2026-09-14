// A fake, in-memory review server for the Playground. Tests pass vi.fn mocks instead.
import type { Purchase, RequestOptions, Review, ReviewApi } from './types';

export interface ServerKnobs {
  /** Fixed delay in ms for every call. */
  latency: number;
  /** 0..1 probability that a call rejects. */
  failRate: number;
}

const SEED: Purchase[] = [
  { id: 'p-101', name: 'Wireless Mouse', purchasedAt: '2026-08-30', price: 799, review: null },
  { id: 'p-102', name: 'Mechanical Keyboard', purchasedAt: '2026-08-21', price: 4499, review: null },
  { id: 'p-103', name: 'USB-C Hub (7-in-1)', purchasedAt: '2026-08-02', price: 2199, review: { rating: 4, text: 'Works with my laptop and monitor. Gets a little warm.' } },
  { id: 'p-104', name: 'Noise Cancelling Headphones', purchasedAt: '2026-07-18', price: 12999, review: null },
  { id: 'p-105', name: 'Laptop Stand', purchasedAt: '2026-06-27', price: 1299, review: null },
  { id: 'p-106', name: 'Steel Water Bottle, 1L', purchasedAt: '2026-06-03', price: 549, review: { rating: 5, text: 'Keeps water cold all day.' } },
];

function wait<T>(produce: () => T, knobs: ServerKnobs, signal?: AbortSignal): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('The operation was aborted.', 'AbortError'));
      return;
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      if (Math.random() < knobs.failRate) reject(new Error('500 Internal Server Error'));
      else resolve(produce());
    }, knobs.latency);
    function onAbort() {
      clearTimeout(timer);
      reject(new DOMException('The operation was aborted.', 'AbortError'));
    }
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

/** `getKnobs` is read on every call, so the Playground can change latency and failure rate live. */
export function createReviewServer(getKnobs: () => ServerKnobs): ReviewApi & { reset(): void } {
  let db: Purchase[] = structuredClone(SEED);
  return {
    getPurchases: (options?: RequestOptions) => wait(() => structuredClone(db), getKnobs(), options?.signal),
    submitReview: (productId: string, review: Review, options?: RequestOptions) =>
      wait(
        () => {
          const purchase = db.find((p) => p.id === productId);
          if (!purchase) throw new Error(`Unknown product ${productId}`);
          const saved = { rating: review.rating, text: review.text.trim() };
          db = db.map((p) => (p.id === productId ? { ...p, review: saved } : p));
          return saved;
        },
        getKnobs(),
        options?.signal,
      ),
    reset() {
      db = structuredClone(SEED);
    },
  };
}
