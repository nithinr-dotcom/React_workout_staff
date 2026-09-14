import { useMemo, useState } from 'react';
import type { DebounceModule } from './types';

export default function Playground({ impl }: { impl: DebounceModule }) {
  const [wait, setWait] = useState(500);
  const [raw, setRaw] = useState(0);
  const [log, setLog] = useState<string[]>([]);
  const [callError, setError] = useState<string | null>(null);

  // Recreated only when `wait` changes. Creating it on every render would defeat debouncing.
  const { debounced, createError } = useMemo(() => {
    try {
      const fn = impl.debounce((value: string) => {
        setLog((l) => [`${new Date().toLocaleTimeString()} → "${value}"`, ...l].slice(0, 12));
      }, wait);
      return { debounced: fn, createError: null };
    } catch (e) {
      return { debounced: null, createError: (e as Error).message };
    }
  }, [impl, wait]);
  const error = createError ?? callError;

  return (
    <div style={{ fontFamily: 'system-ui', display: 'grid', gap: 12, maxWidth: 520 }}>
      <label>
        Wait: {wait}ms{' '}
        <input type="range" min={100} max={2000} step={100} value={wait} onChange={(e) => setWait(Number(e.target.value))} />
      </label>
      <input
        placeholder="Type quickly…"
        style={{ padding: 8, fontSize: 16 }}
        onChange={(e) => {
          setRaw((r) => r + 1);
          try {
            debounced?.(e.target.value);
          } catch (err) {
            setError((err as Error).message);
          }
        }}
      />
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => debounced?.cancel()}>cancel()</button>
        <button onClick={() => debounced?.flush()}>flush()</button>
        <button onClick={() => alert(`pending() = ${debounced?.pending()}`)}>pending()</button>
      </div>
      {error && <p style={{ color: '#b91c1c' }}>Error: {error}</p>}
      <p>
        Keystrokes: <strong>{raw}</strong> · Debounced calls: <strong>{log.length}</strong>
      </p>
      <ol style={{ fontFamily: 'monospace', fontSize: 13 }}>
        {log.map((l, i) => (
          <li key={i}>{l}</li>
        ))}
      </ol>
    </div>
  );
}
