// A fake chunk-upload endpoint for the Playground. Tests pass vi.fn mocks instead.
import type { UploadChunk } from './types';

export interface ServerKnobs {
  /** Simulated throughput in KiB per second. Latency is proportional to chunk size. */
  kibPerSecond: number;
  /** 0..1 probability that a chunk request fails with a 500. */
  failRate: number;
}

export interface ChunkServer {
  uploadChunk: UploadChunk;
  /** fileId → acknowledged chunk indexes, for display. */
  acked: Map<string, Set<number>>;
  /** Requests currently in flight, for checking the concurrency cap. */
  inFlight(): number;
  /** Highest number of concurrent requests seen since the last reset. */
  peak(): number;
  reset(): void;
}

export function createChunkServer(getKnobs: () => ServerKnobs): ChunkServer {
  const acked = new Map<string, Set<number>>();
  let inFlight = 0;
  let peak = 0;

  const uploadChunk: UploadChunk = ({ fileId, index, blob, signal }) =>
    new Promise<void>((resolve, reject) => {
      if (signal.aborted) {
        reject(new DOMException('The operation was aborted.', 'AbortError'));
        return;
      }
      const { kibPerSecond, failRate } = getKnobs();
      inFlight++;
      peak = Math.max(peak, inFlight);
      const ms = Math.max(50, (blob.size / 1024 / kibPerSecond) * 1000);
      const finish = () => {
        inFlight--;
        signal.removeEventListener('abort', onAbort);
      };
      const timer = setTimeout(() => {
        finish();
        if (Math.random() < failRate) {
          reject(new Error(`500: chunk ${index} of ${fileId} failed`));
          return;
        }
        if (!acked.has(fileId)) acked.set(fileId, new Set());
        acked.get(fileId)!.add(index);
        resolve();
      }, ms);
      function onAbort() {
        clearTimeout(timer);
        finish();
        reject(new DOMException('The operation was aborted.', 'AbortError'));
      }
      signal.addEventListener('abort', onAbort, { once: true });
    });

  return {
    uploadChunk,
    acked,
    inFlight: () => inFlight,
    peak: () => peak,
    reset() {
      acked.clear();
      peak = inFlight;
    },
  };
}
