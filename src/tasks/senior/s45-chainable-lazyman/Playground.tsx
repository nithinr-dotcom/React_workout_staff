import { useState } from 'react';
import { USERS } from '../../../mocks/data/datasets';
import type { ChainableModule, FetchLike } from './types';

const box = { border: '1px solid #d0d5dd', borderRadius: 8, padding: 12, display: 'grid', gap: 8 } as const;
const PAGE_SIZE = 5;

export default function Playground({ impl }: { impl: ChainableModule }) {
  const [lazyLog, setLazyLog] = useState<string[]>([]);
  const [netLog, setNetLog] = useState<string[]>([]);
  const [failFirst, setFailFirst] = useState(1);
  const [page, setPage] = useState(1);
  const [role, setRole] = useState('');

  const stamp = (start: number) => `+${((performance.now() - start) / 1000).toFixed(1)}s`;

  const runLazyMan = () => {
    const start = performance.now();
    setLazyLog(['chain built: LazyMan("Jack").eat("banana").sleep(2).eat("apple").sleepFirst(1)']);
    try {
      impl
        .LazyMan('Jack', (message) => setLazyLog((l) => [...l, `${stamp(start)}  ${message}`]))
        .eat('banana')
        .sleep(2)
        .eat('apple')
        .sleepFirst(1);
      setLazyLog((l) => [...l, '(synchronous chain finished)']);
    } catch (e) {
      setLazyLog((l) => [...l, `⚠ ${(e as Error).message}`]);
    }
  };

  const runRequest = () => {
    const start = performance.now();
    let failuresLeft = failFirst;
    setNetLog([]);
    const fakeFetch: FetchLike = (url, init) => {
      setNetLog((l) => [...l, `${stamp(start)}  → ${init.method} ${url}  headers=${JSON.stringify(init.headers)}`]);
      return new Promise((resolve) =>
        setTimeout(() => {
          if (failuresLeft > 0) {
            failuresLeft--;
            setNetLog((l) => [...l, `${stamp(start)}  ← 503`]);
            resolve({ ok: false, status: 503, json: () => Promise.resolve({ message: 'unavailable' }) });
            return;
          }
          const parsed = new URL(url);
          const p = Number(parsed.searchParams.get('page') ?? 1);
          const r = parsed.searchParams.get('role');
          const rows = USERS.filter((u) => !r || u.role === r).slice((p - 1) * PAGE_SIZE, p * PAGE_SIZE);
          setNetLog((l) => [...l, `${stamp(start)}  ← 200 (${rows.length} users)`]);
          resolve({ ok: true, status: 200, json: () => Promise.resolve(rows) });
        }, 400),
      );
    };
    try {
      const client = impl.createApiClient(fakeFetch, { baseUrl: 'https://api.example.com' });
      let request = client.get<{ name: string; role: string }[]>('/users').query({ page }).header('x-trace', 'playground').retry(2);
      if (role) request = request.query({ role });
      Promise.resolve(request).then(
        (rows) => setNetLog((l) => [...l, `✓ ${rows.map((u) => `${u.name} (${u.role})`).join(', ') || 'no users'}`]),
        (e: Error & { status?: number }) => setNetLog((l) => [...l, `✗ ${e.message}${e.status ? ` (status ${e.status})` : ''}`]),
      );
    } catch (e) {
      setNetLog((l) => [...l, `⚠ ${(e as Error).message}`]);
    }
  };

  return (
    <div style={{ fontFamily: 'system-ui', display: 'grid', gap: 12, maxWidth: 760 }}>
      <section style={box}>
        <strong>Part A: LazyMan</strong>
        <div>
          <button onClick={runLazyMan}>Run the chain</button>
        </div>
        <pre style={{ background: '#f2f4f7', padding: 12, minHeight: 100, fontSize: 13, margin: 0 }}>{lazyLog.join('\n') || 'Output appears here.'}</pre>
      </section>
      <section style={box}>
        <strong>Part B: client.get(&apos;/users&apos;).query(…).header(…).retry(2)</strong>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'end' }}>
          <label style={{ display: 'grid', fontSize: 13 }}>
            page
            <input type="number" min={1} value={page} onChange={(e) => setPage(Number(e.target.value))} style={{ width: 70 }} />
          </label>
          <label style={{ display: 'grid', fontSize: 13 }}>
            role (branch)
            <select value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="">any</option>
              {['Engineer', 'Designer', 'Manager', 'Product', 'Support'].map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </label>
          <label style={{ display: 'grid', fontSize: 13 }}>
            503s before success
            <input type="number" min={0} max={5} value={failFirst} onChange={(e) => setFailFirst(Number(e.target.value))} style={{ width: 70 }} />
          </label>
          <button onClick={runRequest}>await request</button>
        </div>
        <pre style={{ background: '#f2f4f7', padding: 12, minHeight: 100, fontSize: 13, margin: 0, whiteSpace: 'pre-wrap' }}>{netLog.join('\n') || 'Requests appear here.'}</pre>
      </section>
    </div>
  );
}
