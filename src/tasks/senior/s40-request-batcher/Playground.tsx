import { useMemo, useRef, useState } from 'react';
import { USERS } from '../../../mocks/data/datasets';
import type { RequestBatcherModule } from './types';

type User = (typeof USERS)[number];

export default function Playground({ impl }: { impl: RequestBatcherModule }) {
  const [maxBatchSize, setMaxBatchSize] = useState(5);
  const [maxWaitMs, setMaxWaitMs] = useState(300);
  const [batches, setBatches] = useState<string[]>([]);
  const [results, setResults] = useState<string[]>([]);
  const startedAt = useRef(performance.now());

  const stamp = () => `+${String(Math.round(performance.now() - startedAt.current)).padStart(5)}ms`;

  const { batcher, createError } = useMemo(() => {
    // Fake batch endpoint: 400ms latency, ids above 1000 come back as "not found" errors.
    const batchFn = (ids: number[]) => {
      setBatches((b) => [`${stamp()}  batchFn([${ids.join(', ')}])`, ...b].slice(0, 12));
      return new Promise<(User | Error)[]>((resolve) =>
        setTimeout(
          () => resolve(ids.map((id) => USERS.find((u) => u.id === id) ?? new Error(`user ${id} not found`))),
          400,
        ),
      );
    };
    try {
      return { batcher: impl.createBatcher<number, User>(batchFn, { maxBatchSize, maxWaitMs }), createError: null };
    } catch (e) {
      return { batcher: null, createError: (e as Error).message };
    }
  }, [impl, maxBatchSize, maxWaitMs]);

  const load = (id: number) => {
    if (!batcher) return;
    try {
      batcher.load(id).then(
        (u) => setResults((r) => [`${stamp()}  load(${id}) → ${u.name}`, ...r].slice(0, 16)),
        (e: Error) => setResults((r) => [`${stamp()}  load(${id}) ✗ ${e.message}`, ...r].slice(0, 16)),
      );
    } catch (e) {
      setResults((r) => [`load(${id}) threw: ${(e as Error).message}`, ...r]);
    }
  };

  const renderFeed = () => {
    startedAt.current = performance.now();
    setBatches([]);
    setResults([]);
    // 12 "posts" whose authors repeat, plus one id that doesn't exist.
    [1, 2, 3, 1, 4, 5, 2, 6, 7, 3, 8, 1001].forEach(load);
  };

  return (
    <div style={{ fontFamily: 'system-ui', display: 'grid', gap: 12, maxWidth: 680 }}>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <label>
          maxBatchSize{' '}
          <input
            type="number"
            min={1}
            value={maxBatchSize}
            onChange={(e) => setMaxBatchSize(Number(e.target.value))}
            style={{ width: 60 }}
          />
        </label>
        <label>
          maxWaitMs: {maxWaitMs}{' '}
          <input type="range" min={0} max={1000} step={50} value={maxWaitMs} onChange={(e) => setMaxWaitMs(Number(e.target.value))} />
        </label>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button type="button" onClick={renderFeed} disabled={!batcher}>
          Render feed (12 loads, 9 unique ids)
        </button>
        <button type="button" onClick={() => load(1 + Math.floor(Math.random() * 10))} disabled={!batcher}>
          load(random id)
        </button>
      </div>
      {createError && <p style={{ color: '#b91c1c' }}>Error: {createError}</p>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        <section>
          <h4 style={{ margin: '0 0 4px' }}>Batches sent</h4>
          <ol style={{ fontFamily: 'monospace', fontSize: 13, margin: 0 }}>
            {batches.map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ol>
        </section>
        <section>
          <h4 style={{ margin: '0 0 4px' }}>Results per caller</h4>
          <ol style={{ fontFamily: 'monospace', fontSize: 13, margin: 0 }}>
            {results.map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}
