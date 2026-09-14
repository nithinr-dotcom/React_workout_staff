import { useState, type ReactNode } from 'react';
import type { ObjectUtilsModule } from './types';

function run(fn: () => unknown): { ok: true; value: string } | { ok: false; error: string } {
  try {
    const value = fn();
    return { ok: true, value: value === undefined ? 'undefined' : JSON.stringify(value, null, 2) };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

function Card({ title, children, result }: { title: string; children: ReactNode; result: ReturnType<typeof run> }) {
  return (
    <section style={{ border: '1px solid #d0d5dd', borderRadius: 8, padding: 12, display: 'grid', gap: 8 }}>
      <h3 style={{ margin: 0, fontFamily: 'monospace' }}>{title}</h3>
      {children}
      <output style={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap', color: result.ok ? '#027a48' : '#b91c1c' }}>
        {result.ok ? `→ ${result.value}` : `Error: ${result.error}`}
      </output>
    </section>
  );
}

const inputStyle = { fontFamily: 'monospace', padding: 6, width: '100%', boxSizing: 'border-box' } as const;

export default function Playground({ impl }: { impl: ObjectUtilsModule }) {
  const [groupJson, setGroupJson] = useState('[{ "name": "Ada", "team": "core" }, { "name": "Linus", "team": "kernel" }, { "name": "Grace", "team": "core" }]');
  const [groupProp, setGroupProp] = useState('team');
  const [chunkJson, setChunkJson] = useState('[1, 2, 3, 4, 5, 6, 7]');
  const [size, setSize] = useState('3');
  const [mergeA, setMergeA] = useState('{ "ui": { "dark": false, "size": "m" }, "tags": [1, 2] }');
  const [mergeB, setMergeB] = useState('{ "ui": { "dark": true }, "tags": [3] }');
  const [omitJson, setOmitJson] = useState('{ "id": 1, "password": "x", "friends": [{ "id": 2, "password": "y" }] }');
  const [omitKeys, setOmitKeys] = useState('password');
  const [squashJson, setSquashJson] = useState('{ "a": { "b": 1, "c": [1, { "d": null }] } }');

  const parse = (text: string) => JSON.parse(text);

  return (
    <div style={{ fontFamily: 'system-ui', display: 'grid', gap: 12, maxWidth: 640 }}>
      <Card title="groupBy(arr, prop)" result={run(() => impl.groupBy(parse(groupJson), groupProp as never))}>
        <label>
          arr (JSON) <input style={inputStyle} value={groupJson} onChange={(e) => setGroupJson(e.target.value)} />
        </label>
        <label>
          prop <input style={{ ...inputStyle, width: 160 }} value={groupProp} onChange={(e) => setGroupProp(e.target.value)} />
        </label>
      </Card>

      <Card title="chunk(arr, size)" result={run(() => impl.chunk(parse(chunkJson), Number(size)))}>
        <label>
          arr (JSON) <input style={inputStyle} value={chunkJson} onChange={(e) => setChunkJson(e.target.value)} />
        </label>
        <label>
          size <input style={{ ...inputStyle, width: 80 }} value={size} onChange={(e) => setSize(e.target.value)} />
        </label>
      </Card>

      <Card title="deepMerge(a, b)" result={run(() => impl.deepMerge(parse(mergeA), parse(mergeB)))}>
        <label>
          a (JSON) <input style={inputStyle} value={mergeA} onChange={(e) => setMergeA(e.target.value)} />
        </label>
        <label>
          b (JSON) <input style={inputStyle} value={mergeB} onChange={(e) => setMergeB(e.target.value)} />
        </label>
      </Card>

      <Card
        title="deepOmit(value, keys)"
        result={run(() =>
          impl.deepOmit(
            parse(omitJson),
            omitKeys.split(',').map((k) => k.trim()).filter(Boolean),
          ),
        )}
      >
        <label>
          value (JSON) <input style={inputStyle} value={omitJson} onChange={(e) => setOmitJson(e.target.value)} />
        </label>
        <label>
          keys (comma-separated) <input style={{ ...inputStyle, width: 240 }} value={omitKeys} onChange={(e) => setOmitKeys(e.target.value)} />
        </label>
      </Card>

      <Card title="squashObject(obj) → unsquashObject(…)" result={run(() => {
        const squashed = impl.squashObject(parse(squashJson));
        return { squashed, unsquashed: impl.unsquashObject(squashed) };
      })}>
        <label>
          obj (JSON) <input style={inputStyle} value={squashJson} onChange={(e) => setSquashJson(e.target.value)} />
        </label>
      </Card>
    </div>
  );
}
