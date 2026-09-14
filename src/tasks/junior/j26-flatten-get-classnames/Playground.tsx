import { useState, type ReactNode } from 'react';
import type { UtilsModule } from './types';

function run(fn: () => unknown): { ok: true; value: string } | { ok: false; error: string } {
  try {
    const value = fn();
    return { ok: true, value: value === undefined ? 'undefined' : JSON.stringify(value) };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

function Card({ title, children, result }: { title: string; children: ReactNode; result: ReturnType<typeof run> }) {
  return (
    <section style={{ border: '1px solid #d0d5dd', borderRadius: 8, padding: 12, display: 'grid', gap: 8 }}>
      <h3 style={{ margin: 0, fontFamily: 'monospace' }}>{title}</h3>
      {children}
      <output style={{ fontFamily: 'monospace', color: result.ok ? '#027a48' : '#b91c1c' }}>
        {result.ok ? `→ ${result.value}` : `Error: ${result.error}`}
      </output>
    </section>
  );
}

const inputStyle = { fontFamily: 'monospace', padding: 6 };

export default function Playground({ impl }: { impl: UtilsModule }) {
  const [arrJson, setArrJson] = useState('[1, [2, [3, [4]]], "five"]');
  const [depth, setDepth] = useState('Infinity');
  const [objJson, setObjJson] = useState('{ "user": { "name": "Ada", "addresses": [{ "city": "London" }] } }');
  const [path, setPath] = useState('user.addresses[0].city');
  const [fallback, setFallback] = useState('n/a');
  const [cxArgs, setCxArgs] = useState('["btn", { "active": true, "disabled": false }, ["lg", null, 0]]');

  const parse = (text: string) => JSON.parse(text);

  return (
    <div style={{ fontFamily: 'system-ui', display: 'grid', gap: 12, maxWidth: 640 }}>
      <Card title="flatten(arr, depth)" result={run(() => impl.flatten(parse(arrJson), depth === 'Infinity' ? Infinity : Number(depth)))}>
        <label>
          arr (JSON) <input style={{ ...inputStyle, width: '100%' }} value={arrJson} onChange={(e) => setArrJson(e.target.value)} />
        </label>
        <label>
          depth <input style={inputStyle} value={depth} onChange={(e) => setDepth(e.target.value)} />
        </label>
      </Card>

      <Card title="get(obj, path, defaultValue)" result={run(() => impl.get(parse(objJson), path, fallback))}>
        <label>
          obj (JSON) <input style={{ ...inputStyle, width: '100%' }} value={objJson} onChange={(e) => setObjJson(e.target.value)} />
        </label>
        <label>
          path <input style={inputStyle} value={path} onChange={(e) => setPath(e.target.value)} />
        </label>
        <label>
          defaultValue <input style={inputStyle} value={fallback} onChange={(e) => setFallback(e.target.value)} />
        </label>
      </Card>

      <Card title="classnames(...args)" result={run(() => impl.classnames(...(parse(cxArgs) as unknown[] as Parameters<UtilsModule['classnames']>)))}>
        <label>
          args (JSON array) <input style={{ ...inputStyle, width: '100%' }} value={cxArgs} onChange={(e) => setCxArgs(e.target.value)} />
        </label>
      </Card>
    </div>
  );
}
