import { useState } from 'react';
import type { PolyfillsModule } from './types';

interface Case {
  label: string;
  yours: (impl: PolyfillsModule) => unknown;
  native: () => unknown;
}

function holey(): number[] {
  const a: number[] = [];
  a[0] = 1;
  a[2] = 3;
  return a;
}

function greet(this: { name: string }, greeting: string) {
  return `${greeting}, ${this.name}`;
}

const CASES: Case[] = [
  { label: 'map([1, 2, 3], n => n * 2)', yours: (i) => i.myMap([1, 2, 3], (n) => n * 2), native: () => [1, 2, 3].map((n) => n * 2) },
  { label: 'map([1, <hole>, 3], n => n * 2)', yours: (i) => i.myMap(holey(), (n) => n * 2), native: () => holey().map((n) => n * 2) },
  { label: 'filter([1, 2, 3, 4], isEven)', yours: (i) => i.myFilter([1, 2, 3, 4], (n) => n % 2 === 0), native: () => [1, 2, 3, 4].filter((n) => n % 2 === 0) },
  { label: 'reduce([1, 2, 3], sum)', yours: (i) => i.myReduce<number, number>([1, 2, 3], (a, b) => a + b), native: () => [1, 2, 3].reduce((a, b) => a + b) },
  { label: 'reduce([], sum)', yours: (i) => i.myReduce<number, number>([], (a, b) => a + b), native: () => ([] as number[]).reduce((a, b) => a + b) },
  { label: 'reduce([], sum, 0)', yours: (i) => i.myReduce<number, number>([], (a, b) => a + b, 0), native: () => ([] as number[]).reduce((a, b) => a + b, 0) },
  { label: "call(greet, { name: 'Ada' }, 'Hi')", yours: (i) => i.myCall(greet, { name: 'Ada' }, 'Hi'), native: () => greet.call({ name: 'Ada' }, 'Hi') },
  { label: "apply(greet, { name: 'Ada' }, ['Hey'])", yours: (i) => i.myApply(greet, { name: 'Ada' }, ['Hey']), native: () => greet.apply({ name: 'Ada' }, ['Hey']) },
  {
    label: "bind(greet, { name: 'Ada' }, 'Yo')()",
    yours: (i) => i.myBind(greet, { name: 'Ada' }, 'Yo')(),
    native: () => greet.bind({ name: 'Ada' }, 'Yo')(),
  },
];

function show(fn: () => unknown): string {
  try {
    const value = fn();
    if (Array.isArray(value)) {
      return `[${Array.from({ length: value.length }, (_, i) => (i in value ? JSON.stringify(value[i]) : '<hole>')).join(', ')}]`;
    }
    return JSON.stringify(value) ?? String(value);
  } catch (e) {
    return `${(e as Error).name}: ${(e as Error).message}`;
  }
}

export default function Playground({ impl }: { impl: PolyfillsModule }) {
  const [runs, setRuns] = useState(0);
  return (
    <div style={{ fontFamily: 'system-ui', display: 'grid', gap: 12, maxWidth: 760 }}>
      <p style={{ margin: 0 }}>
        Each row runs your function next to the native one. A match means the outputs are identical.{' '}
        <button onClick={() => setRuns((r) => r + 1)}>Re-run ({runs})</button>
      </p>
      <table style={{ borderCollapse: 'collapse', fontFamily: 'monospace', fontSize: 13 }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', padding: 6 }}>Call</th>
            <th style={{ textAlign: 'left', padding: 6 }}>Yours</th>
            <th style={{ textAlign: 'left', padding: 6 }}>Native</th>
            <th style={{ padding: 6 }}>Match</th>
          </tr>
        </thead>
        <tbody>
          {CASES.map((c) => {
            const yours = show(() => c.yours(impl));
            const native = show(c.native);
            const nameOnly = (s: string) => s.split(':')[0];
            const match = yours === native || (yours.startsWith('TypeError') && nameOnly(yours) === nameOnly(native));
            return (
              <tr key={c.label} style={{ borderTop: '1px solid #eaecf0' }}>
                <td style={{ padding: 6 }}>{c.label}</td>
                <td style={{ padding: 6 }}>{yours}</td>
                <td style={{ padding: 6 }}>{native}</td>
                <td style={{ padding: 6, textAlign: 'center' }}>{match ? '✅' : '❌'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
