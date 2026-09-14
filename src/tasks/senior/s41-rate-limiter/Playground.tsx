import { useEffect, useMemo, useRef, useState } from 'react';
import type { OverLimitBehaviour, RateLimiterModule } from './types';

function HitCounterDemo({ impl }: { impl: RateLimiterModule }) {
  const [windowMs, setWindowMs] = useState(5000);
  const [count, setCount] = useState<number | string>(0);
  const [hitError, setHitError] = useState<string | null>(null);

  const { counter, createError } = useMemo(() => {
    try {
      return { counter: impl.createHitCounter(windowMs), createError: null };
    } catch (e) {
      return { counter: null, createError: (e as Error).message };
    }
  }, [impl, windowMs]);
  const error = createError ?? hitError;

  // Poll count() so you can watch hits roll out of the window.
  useEffect(() => {
    if (!counter) return;
    const id = setInterval(() => {
      try {
        setCount(counter.count());
      } catch (e) {
        setCount(`error: ${(e as Error).message}`);
      }
    }, 100);
    return () => clearInterval(id);
  }, [counter]);

  const hit = (n: number) => {
    try {
      for (let i = 0; i < n; i++) counter?.hit();
    } catch (e) {
      setHitError((e as Error).message);
    }
  };

  return (
    <section style={{ display: 'grid', gap: 8 }}>
      <h3 style={{ margin: 0 }}>Part A: hit counter</h3>
      <label>
        window: {windowMs}ms{' '}
        <input type="range" min={1000} max={10000} step={1000} value={windowMs} onChange={(e) => setWindowMs(Number(e.target.value))} />
      </label>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button type="button" onClick={() => hit(1)} disabled={!counter}>
          hit()
        </button>
        <button type="button" onClick={() => hit(100_000)} disabled={!counter}>
          burst of 100 000 hits
        </button>
      </div>
      {error && <p style={{ color: '#b91c1c', margin: 0 }}>Error: {error}</p>}
      <p style={{ margin: 0 }}>
        count() = <strong>{count}</strong>
      </p>
    </section>
  );
}

function RateLimiterDemo({ impl }: { impl: RateLimiterModule }) {
  const [limit, setLimit] = useState(3);
  const [windowMs, setWindowMs] = useState(2000);
  const [onLimit, setOnLimit] = useState<OverLimitBehaviour>('reject');
  const [log, setLog] = useState<string[]>([]);
  const startedAt = useRef(performance.now());

  const push = (line: string) => {
    const ms = Math.round(performance.now() - startedAt.current);
    setLog((l) => [`+${String(ms).padStart(6)}ms  ${line}`, ...l].slice(0, 18));
  };

  const { limiter, send, createError } = useMemo(() => {
    try {
      const l = impl.createRateLimiter({ limit, windowMs, onLimit });
      const s = l.wrap((id: number) => `request #${id} sent`);
      return { limiter: l, send: s, createError: null };
    } catch (e) {
      return { limiter: null, send: null, createError: (e as Error).message };
    }
  }, [impl, limit, windowMs, onLimit]);

  const nextId = useRef(1);
  const fire = () => {
    if (!send) return;
    const id = nextId.current++;
    push(`call #${id}`);
    try {
      send(id).then(
        (msg) => push(`✓ ${msg}`),
        (e: Error & { retryAfterMs?: number }) => push(`✗ #${id} ${e.name}: retry after ${e.retryAfterMs}ms`),
      );
    } catch (e) {
      push(`call threw synchronously: ${(e as Error).message}`);
    }
  };

  return (
    <section style={{ display: 'grid', gap: 8 }}>
      <h3 style={{ margin: 0 }}>Part B: rate limiter</h3>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <label>
          limit <input type="number" min={1} value={limit} onChange={(e) => setLimit(Number(e.target.value))} style={{ width: 60 }} />
        </label>
        <label>
          windowMs{' '}
          <input type="number" min={100} step={100} value={windowMs} onChange={(e) => setWindowMs(Number(e.target.value))} style={{ width: 80 }} />
        </label>
        <label>
          onLimit{' '}
          <select value={onLimit} onChange={(e) => setOnLimit(e.target.value as OverLimitBehaviour)}>
            <option value="reject">reject</option>
            <option value="queue">queue</option>
          </select>
        </label>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button type="button" onClick={fire} disabled={!send}>
          wrapped call
        </button>
        <button
          type="button"
          onClick={() => {
            for (let i = 0; i < 6; i++) fire();
          }}
          disabled={!send}
        >
          6 calls at once
        </button>
        <button
          type="button"
          disabled={!limiter}
          onClick={() => {
            try {
              push(`tryAcquire() → ${limiter?.tryAcquire()}`);
            } catch (e) {
              push(`tryAcquire threw: ${(e as Error).message}`);
            }
          }}
        >
          tryAcquire()
        </button>
      </div>
      {createError && <p style={{ color: '#b91c1c', margin: 0 }}>Error: {createError}</p>}
      <ol style={{ fontFamily: 'monospace', fontSize: 13, margin: 0 }}>
        {log.map((l, i) => (
          <li key={i}>{l}</li>
        ))}
      </ol>
    </section>
  );
}

export default function Playground({ impl }: { impl: RateLimiterModule }) {
  return (
    <div style={{ fontFamily: 'system-ui', display: 'grid', gap: 24, maxWidth: 680 }}>
      <HitCounterDemo impl={impl} />
      <RateLimiterDemo impl={impl} />
    </div>
  );
}
