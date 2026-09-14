import { useState, type ChangeEvent } from 'react';
import type { AnyFn, CurryModule } from './types';

function attempt(fn: () => unknown): string {
  try {
    const value = fn();
    return typeof value === 'function' ? 'ƒ (partially applied)' : JSON.stringify(value);
  } catch (e) {
    return `⚠ ${(e as Error).message}`;
  }
}

const STEPS: { id: string; label: string; fn: AnyFn }[] = [
  { id: 'trim', label: 'trim', fn: (s: string) => s.trim() },
  { id: 'upper', label: 'toUpperCase', fn: (s: string) => s.toUpperCase() },
  { id: 'snake', label: 'spaces → _', fn: (s: string) => s.replace(/\s+/g, '_') },
  { id: 'bang', label: 'append "!"', fn: (s: string) => `${s}!` },
  { id: 'wrap', label: 'wrap in [ ]', fn: (s: string) => `[${s}]` },
];

export default function Playground({ impl }: { impl: CurryModule }) {
  const [a, setA] = useState(1);
  const [b, setB] = useState(2);
  const [c, setC] = useState(3);
  const [text, setText] = useState('  hello curry world ');
  const [enabled, setEnabled] = useState<string[]>(['trim', 'snake', 'wrap', 'bang']);

  const volume = (l: number, w: number, h: number) => `${l}×${w}×${h} = ${l * w * h}`;
  const curried = () => impl.curry(volume);
  const fns = STEPS.filter((s) => enabled.includes(s.id)).map((s) => s.fn);
  const order = STEPS.filter((s) => enabled.includes(s.id)).map((s) => s.label);

  const num = (set: (n: number) => void) => (e: ChangeEvent<HTMLInputElement>) => set(Number(e.target.value));

  return (
    <div style={{ fontFamily: 'system-ui', display: 'grid', gap: 24, maxWidth: 640 }}>
      <section style={{ display: 'grid', gap: 8 }}>
        <h3>curry(volume)</h3>
        <div style={{ display: 'flex', gap: 12 }}>
          <label>
            l <input type="number" value={a} onChange={num(setA)} style={{ width: 60 }} />
          </label>
          <label>
            w <input type="number" value={b} onChange={num(setB)} style={{ width: 60 }} />
          </label>
          <label>
            h <input type="number" value={c} onChange={num(setC)} style={{ width: 60 }} />
          </label>
        </div>
        <table style={{ fontFamily: 'monospace', fontSize: 13, borderCollapse: 'collapse' }}>
          <tbody>
            {[
              ['f(l)(w)(h)', () => curried()(a)(b)(c)],
              ['f(l, w)(h)', () => curried()(a, b)(c)],
              ['f(l)(w, h)', () => curried()(a)(b, c)],
              ['f(l, w, h)', () => curried()(a, b, c)],
              ['f(l)(w)', () => curried()(a)(b)],
              ['f()()(l)()(w, h)', () => curried()()()(a)()(b, c)],
            ].map(([label, run]) => (
              <tr key={label as string}>
                <td style={{ padding: '2px 12px 2px 0' }}>{label as string}</td>
                <td>{attempt(run as () => unknown)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section style={{ display: 'grid', gap: 8 }}>
        <h3>pipe vs compose</h3>
        <label style={{ display: 'grid', gap: 4 }}>
          Input
          <input value={text} onChange={(e) => setText(e.target.value)} style={{ fontFamily: 'monospace', padding: 6 }} />
        </label>
        <fieldset style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          <legend>Steps (in list order)</legend>
          {STEPS.map((s) => (
            <label key={s.id}>
              <input
                type="checkbox"
                checked={enabled.includes(s.id)}
                onChange={(e) => setEnabled((prev) => (e.target.checked ? [...prev, s.id] : prev.filter((id) => id !== s.id)))}
              />{' '}
              {s.label}
            </label>
          ))}
        </fieldset>
        <p style={{ fontSize: 13, color: '#475467', margin: 0 }}>Steps: {order.join(', ') || '(none)'}</p>
        <p style={{ fontFamily: 'monospace', margin: 0 }}>pipe(...steps)(input) → {attempt(() => impl.pipe(...fns)(text))}</p>
        <p style={{ fontFamily: 'monospace', margin: 0 }}>compose(...steps)(input) → {attempt(() => impl.compose(...fns)(text))}</p>
      </section>
    </div>
  );
}
