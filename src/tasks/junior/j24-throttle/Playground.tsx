import { useMemo, useState } from 'react';
import type { ThrottleModule } from './types';

export default function Playground({ impl }: { impl: ThrottleModule }) {
  const [wait, setWait] = useState(300);
  const [leading, setLeading] = useState(true);
  const [trailing, setTrailing] = useState(true);
  const [raw, setRaw] = useState(0);
  const [calls, setCalls] = useState<{ x: number; y: number; at: string }[]>([]);
  const [callError, setError] = useState<string | null>(null);

  // Recreated only when the options change. Creating it on every render would reset the window.
  const { throttled, createError } = useMemo(() => {
    try {
      const fn = impl.throttle(
        (x: number, y: number) => {
          setCalls((c) => [{ x, y, at: new Date().toLocaleTimeString() }, ...c].slice(0, 10));
        },
        wait,
        { leading, trailing },
      );
      return { throttled: fn, createError: null };
    } catch (e) {
      return { throttled: null, createError: (e as Error).message };
    }
  }, [impl, wait, leading, trailing]);
  const error = createError ?? callError;

  return (
    <div style={{ fontFamily: 'system-ui', display: 'grid', gap: 12, maxWidth: 560 }}>
      <label>
        Wait: {wait}ms{' '}
        <input type="range" min={50} max={2000} step={50} value={wait} onChange={(e) => setWait(Number(e.target.value))} />
      </label>
      <div style={{ display: 'flex', gap: 16 }}>
        <label>
          <input type="checkbox" checked={leading} onChange={(e) => setLeading(e.target.checked)} /> leading
        </label>
        <label>
          <input type="checkbox" checked={trailing} onChange={(e) => setTrailing(e.target.checked)} /> trailing
        </label>
      </div>
      <div
        role="presentation"
        style={{ height: 160, border: '2px dashed #98a2b3', borderRadius: 8, display: 'grid', placeItems: 'center', color: '#475467' }}
        onPointerMove={(e) => {
          setRaw((r) => r + 1);
          const rect = e.currentTarget.getBoundingClientRect();
          try {
            throttled?.(Math.round(e.clientX - rect.left), Math.round(e.clientY - rect.top));
          } catch (err) {
            setError((err as Error).message);
          }
        }}
      >
        Move your pointer here
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => throttled?.cancel()}>cancel()</button>
        <button
          onClick={() => {
            try {
              throttled?.flush();
            } catch (err) {
              setError((err as Error).message);
            }
          }}
        >
          flush() (follow-up)
        </button>
      </div>
      {error && <p style={{ color: '#b91c1c' }}>Error: {error}</p>}
      <p>
        Pointer events: <strong>{raw}</strong> · Throttled calls: <strong>{calls.length === 10 ? '10+' : calls.length}</strong>
      </p>
      <ol style={{ fontFamily: 'monospace', fontSize: 13 }}>
        {calls.map((c, i) => (
          <li key={i}>
            {c.at} → ({c.x}, {c.y})
          </li>
        ))}
      </ol>
    </div>
  );
}
