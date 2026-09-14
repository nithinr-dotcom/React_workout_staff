import { useMemo, useState, type ComponentType } from 'react';
import { COLUMNS, generateRows } from './data';
import type { DataGridProps } from './types';

export default function Playground({ impl }: { impl: { default: ComponentType<DataGridProps> } }) {
  const DataGrid = impl.default;
  const [count, setCount] = useState(10_000);
  const rows = useMemo(() => generateRows(count), [count]);
  const [latency, setLatency] = useState<number | null>(null);
  const [worst, setWorst] = useState(0);
  const [text, setText] = useState('');

  return (
    <div style={{ display: 'grid', gap: 12, fontFamily: 'system-ui' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center' }}>
        <label>
          Rows{' '}
          <select value={count} onChange={(e) => setCount(Number(e.target.value))}>
            <option value={0}>0</option>
            <option value={100}>100</option>
            <option value={10000}>10,000</option>
            <option value={100000}>100,000</option>
          </select>
        </label>
        <label>
          Type here while a sort runs{' '}
          <input
            value={text}
            placeholder="responsiveness probe"
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              const start = e.timeStamp;
              // Rough "keydown → next frame" latency. Use the Performance panel (INP) for real numbers.
              requestAnimationFrame(() => {
                const ms = performance.now() - start;
                setLatency(ms);
                setWorst((w) => Math.max(w, ms));
              });
            }}
          />
        </label>
        <span>
          Last key → frame: <strong>{latency === null ? '—' : `${latency.toFixed(0)} ms`}</strong> · worst:{' '}
          <strong>{worst.toFixed(0)} ms</strong>{' '}
          <button type="button" onClick={() => setWorst(0)}>
            reset
          </button>
        </span>
        <span>
          DOM cells: <DomCounter />
        </span>
      </div>
      <DataGrid rows={rows} columns={COLUMNS} aria-label="Customer accounts" width={900} height={500} />
    </div>
  );
}

function DomCounter() {
  const [n, setN] = useState<number | null>(null);
  return (
    <button type="button" onClick={() => setN(document.querySelectorAll('[role="gridcell"]').length)}>
      {n === null ? 'count now' : `${n} (count again)`}
    </button>
  );
}
