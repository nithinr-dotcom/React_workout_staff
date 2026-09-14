import { useState } from 'react';
import type { JsonModule } from './types';

const cyclic: Record<string, unknown> = { name: 'root' };
cyclic.self = cyclic;

const PRESETS: { label: string; value: () => unknown }[] = [
  { label: 'Omitted vs null', value: () => ({ a: undefined, fn: () => 1, list: [undefined, () => 1, Symbol('s')] }) },
  { label: 'NaN / Infinity / -0', value: () => [NaN, Infinity, -Infinity, -0] },
  { label: 'Date & toJSON', value: () => ({ when: new Date(), custom: { toJSON: (key: string) => `toJSON(${key})` } }) },
  { label: 'Escapes', value: () => 'quote " backslash \\ newline \n tab \t control \u0001' },
  { label: 'Map / Set / boxed', value: () => ({ map: new Map([[1, 2]]), set: new Set([1]), boxed: new String('s') }) },
  { label: 'Shared reference', value: () => ((shared) => ({ a: shared, b: shared }))({ x: 1 }) },
  { label: 'Circular (throws)', value: () => cyclic },
  { label: 'BigInt (throws)', value: () => ({ big: 10n }) },
];

type Outcome = { ok: true; text: string } | { ok: false; text: string };

function attempt(run: () => unknown): Outcome {
  try {
    const result = run();
    return { ok: true, text: result === undefined ? 'undefined' : typeof result === 'string' ? result : String(result) };
  } catch (e) {
    return { ok: false, text: `${(e as Error).name}: ${(e as Error).message}` };
  }
}

function Compare({ mine, native }: { mine: Outcome; native: Outcome }) {
  const same = mine.ok ? native.ok && mine.text === native.text : !native.ok;
  const cell = (title: string, o: Outcome) => (
    <div>
      <strong>{title}</strong>
      <pre style={{ margin: 0, whiteSpace: 'pre-wrap', color: o.ok ? undefined : '#b91c1c' }}>{o.text}</pre>
    </div>
  );
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
        {cell('yours', mine)}
        {cell('native', native)}
      </div>
      <span style={{ color: same ? '#15803d' : '#b91c1c' }}>{same ? '✓ matches native' : '✗ differs from native'}</span>
    </div>
  );
}

export default function Playground({ impl }: { impl: JsonModule }) {
  const [preset, setPreset] = useState(0);
  const [space, setSpace] = useState('');
  const [text, setText] = useState('{ "a": [1, 2.5e3, true, null], "b": "\\u00e9\\n" }');

  const value = PRESETS[preset].value();
  const spaceArg = space === '' ? undefined : /^\d+$/.test(space) ? Number(space) : space;

  return (
    <div style={{ fontFamily: 'system-ui', display: 'grid', gap: 24, maxWidth: 720 }}>
      <section style={{ display: 'grid', gap: 8 }}>
        <h3 style={{ margin: 0 }}>stringify</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {PRESETS.map((p, i) => (
            <button key={p.label} type="button" aria-pressed={i === preset} onClick={() => setPreset(i)}>
              {p.label}
            </button>
          ))}
        </div>
        <label>
          space (follow-up 1, blank = none){' '}
          <input value={space} onChange={(e) => setSpace(e.target.value)} style={{ width: 80 }} />
        </label>
        <Compare
          mine={attempt(() => impl.stringify(value, undefined, spaceArg))}
          native={attempt(() => JSON.stringify(value, undefined, spaceArg))}
        />
      </section>

      <section style={{ display: 'grid', gap: 8 }}>
        <h3 style={{ margin: 0 }}>parse</h3>
        <label style={{ display: 'grid', gap: 4 }}>
          JSON text
          <textarea rows={4} value={text} onChange={(e) => setText(e.target.value)} style={{ fontFamily: 'monospace' }} />
        </label>
        <p style={{ margin: 0, fontSize: 13 }}>Results are shown re-serialised with native JSON so they can be compared.</p>
        <Compare
          mine={attempt(() => JSON.stringify(impl.parse(text)))}
          native={attempt(() => JSON.stringify(JSON.parse(text)))}
        />
      </section>
    </div>
  );
}
