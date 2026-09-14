import { useMemo, useRef, useState } from 'react';
import type { AsyncMemoizeModule } from './types';

interface Query {
  id: number;
  fields: string[];
  filter: Record<string, string>;
}

export default function Playground({ impl }: { impl: AsyncMemoizeModule }) {
  const [ttl, setTtl] = useState(3000);
  const [failRate, setFailRate] = useState(0.2);
  const [log, setLog] = useState<string[]>([]);
  const [requests, setRequests] = useState(0);
  const failRef = useRef(failRate);
  const requestCount = useRef(0);

  const push = (line: string) =>
    setLog((l) => [`${new Date().toLocaleTimeString()}  ${line}`, ...l].slice(0, 16));

  const { getUser, createError } = useMemo(() => {
    const fakeRequest = (q: Query) =>
      new Promise<string>((resolve, reject) => {
        requestCount.current += 1;
        setRequests(requestCount.current);
        setTimeout(() => {
          if (Math.random() < failRef.current) reject(new Error(`request for user ${q.id} failed`));
          else resolve(`User #${q.id} {${q.fields.join(', ')}}`);
        }, 800);
      });
    try {
      return { getUser: impl.memoizeAsync(fakeRequest, { ttl }), createError: null };
    } catch (e) {
      return { getUser: null, createError: (e as Error).message };
    }
  }, [impl, ttl]);

  const call = (label: string, q: Query) => {
    if (!getUser) return;
    try {
      getUser(q).then(
        (v) => push(`${label} → ${v}`),
        (e: Error) => push(`${label} ✗ ${e.message}`),
      );
    } catch (e) {
      push(`${label} threw synchronously: ${(e as Error).message}`);
    }
  };

  const widgets = () => {
    call('widget A', { id: 7, fields: ['name'], filter: { team: 'web', role: 'staff' } });
    call('widget B', { filter: { role: 'staff', team: 'web' }, fields: ['name'], id: 7 });
    call('widget C', { fields: ['name'], id: 7, filter: { team: 'web', role: 'staff' } });
  };

  return (
    <div style={{ fontFamily: 'system-ui', display: 'grid', gap: 12, maxWidth: 640 }}>
      <label>
        ttl: {ttl}ms{' '}
        <input type="range" min={0} max={10000} step={500} value={ttl} onChange={(e) => setTtl(Number(e.target.value))} />
      </label>
      <label>
        failure rate: {Math.round(failRate * 100)}%{' '}
        <input
          type="range"
          min={0}
          max={1}
          step={0.1}
          value={failRate}
          onChange={(e) => {
            failRef.current = Number(e.target.value);
            setFailRate(failRef.current);
          }}
        />
      </label>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button type="button" onClick={widgets} disabled={!getUser}>
          Render 3 widgets (same query, shuffled keys)
        </button>
        <button type="button" onClick={() => call('user 8', { id: 8, fields: ['name'], filter: {} })} disabled={!getUser}>
          getUser(id 8)
        </button>
        <button
          type="button"
          onClick={() => {
            try {
              push(`delete(user 7) → ${getUser?.delete({ id: 7, fields: ['name'], filter: { team: 'web', role: 'staff' } })}`);
            } catch (e) {
              push(`delete threw: ${(e as Error).message}`);
            }
          }}
        >
          delete(user 7)
        </button>
        <button
          type="button"
          onClick={() => {
            try {
              getUser?.clear();
              push('clear()');
            } catch (e) {
              push(`clear threw: ${(e as Error).message}`);
            }
          }}
        >
          clear()
        </button>
      </div>
      {createError && <p style={{ color: '#b91c1c' }}>Error: {createError}</p>}
      <p style={{ margin: 0 }}>
        Real requests made: <strong>{requests}</strong> (each takes 800ms)
      </p>
      <ol style={{ fontFamily: 'monospace', fontSize: 13, margin: 0 }}>
        {log.map((l, i) => (
          <li key={i}>{l}</li>
        ))}
      </ol>
    </div>
  );
}
