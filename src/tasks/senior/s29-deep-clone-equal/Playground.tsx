import { useState } from 'react';
import type { DeepModule } from './types';

interface Check {
  label: string;
  ok: boolean | null;
  detail?: string;
}

function run(label: string, fn: () => boolean): Check {
  try {
    return { label, ok: fn() };
  } catch (e) {
    return { label, ok: null, detail: (e as Error).message };
  }
}

function makeSample() {
  const shared = { id: 1, tags: ['x', 'y'] };
  const sample: Record<string, unknown> = {
    createdAt: new Date('2026-09-01T10:00:00Z'),
    pattern: /todo-\d+/gi,
    owners: new Map<string, unknown>([['ada', shared]]),
    labels: new Set(['bug', shared]),
    items: [shared, { nested: { deeper: [1, 2, 3] } }],
  };
  sample.self = sample;
  return { sample, shared };
}

export default function Playground({ impl }: { impl: DeepModule }) {
  const [checks, setChecks] = useState<Check[]>([]);
  const [left, setLeft] = useState('{ "a": [1, 2, { "b": null }], "c": "x" }');
  const [right, setRight] = useState('{ "c": "x", "a": [1, 2, { "b": null }] }');
  const [equalResult, setEqualResult] = useState<string>('');

  const runCloneChecks = () => {
    const { sample, shared } = makeSample();
    let c: Record<string, unknown>;
    try {
      c = impl.deepClone(sample);
    } catch (e) {
      setChecks([{ label: 'deepClone(sample)', ok: null, detail: (e as Error).message }]);
      return;
    }
    const results: Check[] = [{ label: 'deepClone(sample) runs', ok: true }];
    {
      const items = c.items as unknown[];
      results.push(
        run('copy !== sample', () => c !== sample),
        run('copy.self === copy (cycle preserved)', () => c.self === c),
        run('copy.createdAt is a new Date with same time', () => c.createdAt instanceof Date && c.createdAt !== sample.createdAt && (c.createdAt as Date).getTime() === (sample.createdAt as Date).getTime()),
        run('copy.pattern is a new RegExp with flags "gi"', () => c.pattern instanceof RegExp && c.pattern !== sample.pattern && (c.pattern as RegExp).flags === 'gi'),
        run('copy.items[0] !== shared', () => items[0] !== shared),
        run('shared reference cloned once (items[0] === owners.get("ada"))', () => items[0] === (c.owners as Map<string, unknown>).get('ada')),
        run('deepEqual(sample, copy)', () => impl.deepEqual(sample, c)),
      );
    }
    setChecks(results);
  };

  const compare = () => {
    try {
      const a = JSON.parse(left);
      const b = JSON.parse(right);
      setEqualResult(`deepEqual → ${impl.deepEqual(a, b)}`);
    } catch (e) {
      setEqualResult(`Error: ${(e as Error).message}`);
    }
  };

  return (
    <div style={{ fontFamily: 'system-ui', display: 'grid', gap: 24, maxWidth: 640 }}>
      <section>
        <h3>deepClone on a tricky object</h3>
        <p style={{ fontSize: 13, color: '#475467' }}>
          The sample contains a Date, a RegExp, a Map, a Set, a shared object referenced three times, and <code>sample.self = sample</code>.
        </p>
        <button type="button" onClick={runCloneChecks}>
          Run checks
        </button>
        <ul style={{ listStyle: 'none', padding: 0, fontFamily: 'monospace', fontSize: 13 }}>
          {checks.map((c) => (
            <li key={c.label} style={{ color: c.ok === null ? '#b91c1c' : c.ok ? '#067647' : '#b42318' }}>
              {c.ok === null ? '⚠' : c.ok ? '✓' : '✗'} {c.label}
              {c.detail ? ` (${c.detail})` : ''}
            </li>
          ))}
        </ul>
      </section>
      <section style={{ display: 'grid', gap: 8 }}>
        <h3>deepEqual on JSON</h3>
        <label style={{ display: 'grid', gap: 4 }}>
          Left
          <textarea rows={3} value={left} onChange={(e) => setLeft(e.target.value)} style={{ fontFamily: 'monospace' }} />
        </label>
        <label style={{ display: 'grid', gap: 4 }}>
          Right
          <textarea rows={3} value={right} onChange={(e) => setRight(e.target.value)} style={{ fontFamily: 'monospace' }} />
        </label>
        <div>
          <button type="button" onClick={compare}>
            Compare
          </button>{' '}
          <strong style={{ color: equalResult.startsWith('Error') ? '#b91c1c' : undefined }}>{equalResult}</strong>
        </div>
      </section>
    </div>
  );
}
