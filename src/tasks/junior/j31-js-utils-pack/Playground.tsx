import { useMemo, useState, type ReactNode } from 'react';
import type { JsUtilsModule } from './types';

function attempt<T>(fn: () => T): { ok: true; value: T } | { ok: false; error: string } {
  try {
    return { ok: true, value: fn() };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={{ border: '1px solid #d0d5dd', borderRadius: 8, padding: 12, display: 'grid', gap: 8 }}>
      <h3 style={{ margin: 0, fontFamily: 'monospace' }}>{title}</h3>
      {children}
    </section>
  );
}

function Result({ result }: { result: { ok: true; value: unknown } | { ok: false; error: string } }) {
  return (
    <output style={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap', color: result.ok ? '#027a48' : '#b91c1c' }}>
      {result.ok ? `→ ${JSON.stringify(result.value)}` : `Error: ${result.error}`}
    </output>
  );
}

const row = { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' } as const;
const PERMS = ['123', '132', '213', '231', '312', '321'];

export default function Playground({ impl }: { impl: JsUtilsModule }) {
  const [names, setNames] = useState('Bob, Ben, Tim, Jane, John, Bob');
  const [length, setLength] = useState('3');
  const [unique, setUnique] = useState(true);
  const [sorted, setSorted] = useState(false);

  const [twiceLog, setTwiceLog] = useState<string[]>([]);
  const twice = useMemo(() => attempt(() => impl.onlyTwice((n: number) => `computed on call #${n}`)), [impl]);
  const [callNo, setCallNo] = useState(1);

  const [counts, setCounts] = useState<Record<string, number> | null>(null);
  const [shuffleError, setShuffleError] = useState<string | null>(null);

  const [key, setKey] = useState('otp');
  const [value, setValue] = useState('1234');
  const [ttl, setTtl] = useState('5000');
  const [readBack, setReadBack] = useState<{ ok: true; value: unknown } | { ok: false; error: string } | null>(null);
  const store = useMemo(() => attempt(() => impl.createExpiringStorage()), [impl]);

  return (
    <div style={{ fontFamily: 'system-ui', display: 'grid', gap: 12, maxWidth: 640 }}>
      <Card title="listFormat(items, options)">
        <label>
          items (comma-separated) <input style={{ width: '100%', padding: 6 }} value={names} onChange={(e) => setNames(e.target.value)} />
        </label>
        <div style={row}>
          <label>
            length <input style={{ width: 60 }} value={length} onChange={(e) => setLength(e.target.value)} />
          </label>
          <label>
            <input type="checkbox" checked={unique} onChange={(e) => setUnique(e.target.checked)} /> unique
          </label>
          <label>
            <input type="checkbox" checked={sorted} onChange={(e) => setSorted(e.target.checked)} /> sorted
          </label>
        </div>
        <Result
          result={attempt(() =>
            impl.listFormat(
              names.split(',').map((s) => s.trim()),
              { length: length === '' ? undefined : Number(length), unique, sorted },
            ),
          )}
        />
      </Card>

      <Card title="onlyTwice(fn)">
        <div style={row}>
          <button
            onClick={() => {
              if (!twice.ok) return;
              try {
                const out = twice.value(callNo);
                setTwiceLog((l) => [...l, `call #${callNo} → ${out}`]);
              } catch (e) {
                setTwiceLog((l) => [...l, `call #${callNo} → Error: ${(e as Error).message}`]);
              }
              setCallNo((n) => n + 1);
            }}
          >
            Call it
          </button>
        </div>
        {!twice.ok && <Result result={twice} />}
        <ol style={{ margin: 0, fontFamily: 'monospace', fontSize: 13 }}>
          {twiceLog.map((l, i) => (
            <li key={i}>{l}</li>
          ))}
        </ol>
      </Card>

      <Card title="shuffle([1, 2, 3]) × 60 000">
        <div style={row}>
          <button
            onClick={() => {
              try {
                const next: Record<string, number> = Object.fromEntries(PERMS.map((p) => [p, 0]));
                for (let i = 0; i < 60_000; i++) {
                  const k = impl.shuffle([1, 2, 3]).join('');
                  next[k] = (next[k] ?? 0) + 1;
                }
                setCounts(next);
                setShuffleError(null);
              } catch (e) {
                setShuffleError((e as Error).message);
              }
            }}
          >
            Run
          </button>
          <small>Each bar should be close to 10 000.</small>
        </div>
        {shuffleError && <p style={{ color: '#b91c1c', margin: 0 }}>Error: {shuffleError}</p>}
        {counts &&
          Object.entries(counts).map(([perm, n]) => (
            <div key={perm} style={row}>
              <code>{perm}</code>
              <div style={{ height: 12, width: `${(n / 20_000) * 100}%`, background: '#7f56d9', borderRadius: 3 }} />
              <small>{n}</small>
            </div>
          ))}
      </Card>

      <Card title="createExpiringStorage() over localStorage">
        {!store.ok ? (
          <Result result={store} />
        ) : (
          <>
            <div style={row}>
              <label>
                key <input style={{ width: 90 }} value={key} onChange={(e) => setKey(e.target.value)} />
              </label>
              <label>
                value <input style={{ width: 90 }} value={value} onChange={(e) => setValue(e.target.value)} />
              </label>
              <label>
                ttlMs <input style={{ width: 70 }} value={ttl} onChange={(e) => setTtl(e.target.value)} />
              </label>
            </div>
            <div style={row}>
              <button onClick={() => setReadBack(attempt(() => store.value.setItem(key, value, ttl === '' ? undefined : Number(ttl))))}>
                setItem
              </button>
              <button onClick={() => setReadBack(attempt(() => store.value.getItem(key)))}>getItem</button>
              <button onClick={() => setReadBack(attempt(() => store.value.removeItem(key)))}>removeItem</button>
            </div>
            {readBack && <Result result={readBack} />}
          </>
        )}
      </Card>
    </div>
  );
}
