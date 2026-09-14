import { useMemo, useState } from 'react';
import type { LRUCacheLike, MemoizeModule } from './types';

const errorStyle = { color: '#b91c1c' };

function LruDemo({ impl }: { impl: MemoizeModule }) {
  const [capacity, setCapacity] = useState(3);
  const [key, setKey] = useState('a');
  const [value, setValue] = useState('1');
  const [log, setLog] = useState<string[]>([]);
  const [, force] = useState(0);
  const [opError, setOpError] = useState<string | null>(null);

  const push = (line: string) => setLog((l) => [line, ...l].slice(0, 10));

  const { cache, createError } = useMemo(() => {
    try {
      const c: LRUCacheLike<string, string> = new impl.LRUCache<string, string>(capacity, {
        onEvict: (k, v) => setLog((l) => [`evicted ${k}=${v}`, ...l].slice(0, 10)),
      });
      return { cache: c, createError: null };
    } catch (e) {
      return { cache: null, createError: (e as Error).message };
    }
  }, [impl, capacity]);

  const op = (label: string, run: (c: LRUCacheLike<string, string>) => unknown) => {
    if (!cache) return;
    try {
      const result = run(cache);
      push(`${label} → ${JSON.stringify(result)}`);
      setOpError(null);
    } catch (e) {
      setOpError((e as Error).message);
    }
    force((n) => n + 1);
  };

  let keys: string[] = [];
  let size: number | string = '?';
  try {
    if (cache) {
      keys = cache.keys();
      size = cache.size;
    }
  } catch {
    // not implemented yet
  }
  const error = createError ?? opError;

  return (
    <section style={{ display: 'grid', gap: 8 }}>
      <h3>LRUCache</h3>
      <label>
        Capacity{' '}
        <input type="number" min={1} value={capacity} onChange={(e) => setCapacity(Number(e.target.value))} style={{ width: 60 }} />
      </label>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <label>
          key <input value={key} onChange={(e) => setKey(e.target.value)} style={{ width: 60 }} />
        </label>
        <label>
          value <input value={value} onChange={(e) => setValue(e.target.value)} style={{ width: 60 }} />
        </label>
        <button type="button" onClick={() => op(`put(${key}, ${value})`, (c) => c.put(key, value))}>
          put
        </button>
        <button type="button" onClick={() => op(`get(${key})`, (c) => c.get(key))}>
          get
        </button>
        <button type="button" onClick={() => op(`has(${key})`, (c) => c.has(key))}>
          has
        </button>
        <button type="button" onClick={() => op(`delete(${key})`, (c) => c.delete(key))}>
          delete
        </button>
        <button type="button" onClick={() => op('clear()', (c) => c.clear())}>
          clear
        </button>
      </div>
      {error && <p style={errorStyle}>Error: {error}</p>}
      <p style={{ fontFamily: 'monospace', margin: 0 }}>
        size = {size} · keys (LRU → MRU): [{keys.join(', ')}]
      </p>
      <ol style={{ fontFamily: 'monospace', fontSize: 13, margin: 0 }}>
        {log.map((l, i) => (
          <li key={i}>{l}</li>
        ))}
      </ol>
    </section>
  );
}

function MemoDemo({ impl }: { impl: MemoizeModule }) {
  const [calls, setCalls] = useState(0);
  const [output, setOutput] = useState<string[]>([]);
  const [n, setN] = useState(30);

  const { slowFib, fetchUser, createError } = useMemo(() => {
    let underlying = 0;
    const fib = (x: number): number => (x < 2 ? x : fib(x - 1) + fib(x - 2));
    try {
      const slowFibMemo = impl.memoize(
        (x: number) => {
          underlying++;
          setCalls(underlying);
          return fib(x);
        },
        { maxSize: 5, ttl: 10_000 },
      );
      const fetchUserMemo = impl.memoize(
        (id: number) =>
          new Promise<string>((resolve, reject) => {
            underlying++;
            setCalls(underlying);
            setTimeout(() => (Math.random() < 0.3 ? reject(new Error(`user ${id} failed`)) : resolve(`User #${id}`)), 800);
          }),
      );
      return { slowFib: slowFibMemo, fetchUser: fetchUserMemo, createError: null };
    } catch (e) {
      return { slowFib: null, fetchUser: null, createError: (e as Error).message };
    }
  }, [impl]);

  const say = (line: string) => setOutput((o) => [line, ...o].slice(0, 10));

  return (
    <section style={{ display: 'grid', gap: 8 }}>
      <h3>memoize</h3>
      {createError && <p style={errorStyle}>Error: {createError}</p>}
      <p style={{ margin: 0 }}>
        Underlying calls: <strong>{calls}</strong>
      </p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <label>
          n <input type="number" min={0} max={35} value={n} onChange={(e) => setN(Number(e.target.value))} style={{ width: 60 }} />
        </label>
        <button
          type="button"
          disabled={!slowFib}
          onClick={() => {
            const t = performance.now();
            try {
              const result = slowFib!(n);
              say(`fib(${n}) = ${result} in ${(performance.now() - t).toFixed(1)}ms (maxSize 5, ttl 10s)`);
            } catch (e) {
              say(`Error: ${(e as Error).message}`);
            }
          }}
        >
          fib(n)
        </button>
        <button
          type="button"
          disabled={!fetchUser}
          onClick={() => {
            try {
              const a = fetchUser!(n);
              const b = fetchUser!(n);
              say(`fetchUser(${n}) twice → same promise? ${a === b}`);
              a.then(
                (u) => say(`resolved: ${u}`),
                (e: Error) => say(`rejected: ${e.message} (should retry on next click)`),
              );
            } catch (e) {
              say(`Error: ${(e as Error).message}`);
            }
          }}
        >
          fetchUser(n) ×2 concurrently
        </button>
      </div>
      <ol style={{ fontFamily: 'monospace', fontSize: 13, margin: 0 }}>
        {output.map((l, i) => (
          <li key={i}>{l}</li>
        ))}
      </ol>
    </section>
  );
}

export default function Playground({ impl }: { impl: MemoizeModule }) {
  return (
    <div style={{ fontFamily: 'system-ui', display: 'grid', gap: 24, maxWidth: 680 }}>
      <LruDemo impl={impl} />
      <MemoDemo impl={impl} />
    </div>
  );
}
