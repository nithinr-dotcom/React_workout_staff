import { Profiler, useCallback, useEffect, useRef, useState, type ComponentType, type ProfilerOnRenderCallback, type RefObject } from 'react';
import { makeItems } from './data';
import type { DashboardProps, RenderName } from './types';

const NAMES: RenderName[] = ['Dashboard', 'Header', 'Clock', 'ThemeToggle', 'Sidebar', 'FilterInput', 'ItemList', 'Row', 'computeStats'];

interface Totals {
  counts: Map<RenderName, number>;
  commits: number;
  lastCommitMs: number;
  slowestCommitMs: number;
}

const freshTotals = (): Totals => ({ counts: new Map(), commits: 0, lastCommitMs: 0, slowestCommitMs: 0 });

export default function Playground({ impl }: { impl: { default: ComponentType<DashboardProps> } }) {
  const Dashboard = impl.default;
  const [items] = useState(() => makeItems(500));
  // Counters live in a ref: updating React state from inside a render would itself cause renders.
  const totals = useRef<Totals>(freshTotals());
  const [onRender] = useState(() => (name: RenderName) => {
    totals.current.counts.set(name, (totals.current.counts.get(name) ?? 0) + 1);
  });
  const onCommit = useCallback<ProfilerOnRenderCallback>((_id, _phase, actualDuration) => {
    totals.current.commits++;
    totals.current.lastCommitMs = actualDuration;
    totals.current.slowestCommitMs = Math.max(totals.current.slowestCommitMs, actualDuration);
  }, []);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 220px', gap: 16, alignItems: 'start' }}>
      <Profiler id="Dashboard" onRender={onCommit}>
        <Dashboard items={items} onRender={onRender} />
      </Profiler>
      <CounterPanel totals={totals} />
    </div>
  );
}

function CounterPanel({ totals }: { totals: RefObject<Totals> }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 500);
    return () => clearInterval(id);
  }, []);
  const { counts, commits, lastCommitMs, slowestCommitMs } = totals.current;

  return (
    <aside style={{ border: '1px solid #d0d5dd', borderRadius: 8, padding: 12, fontSize: 13, fontFamily: 'ui-monospace, monospace' }}>
      <strong>Render counts</strong>
      <table style={{ width: '100%', marginTop: 8 }}>
        <tbody>
          {NAMES.map((name) => (
            <tr key={name}>
              <td>{name}</td>
              <td style={{ textAlign: 'right' }}>{counts.get(name) ?? 0}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p style={{ margin: '8px 0 4px' }}>Commits: {commits}</p>
      <p style={{ margin: '4px 0' }}>Last commit: {lastCommitMs.toFixed(1)}ms</p>
      <p style={{ margin: '4px 0' }}>Slowest: {slowestCommitMs.toFixed(1)}ms</p>
      <button type="button" onClick={() => (totals.current = freshTotals())}>
        Reset counters
      </button>
      <p style={{ color: '#667085', fontFamily: 'system-ui' }}>
        Try: wait 5s, type one letter, toggle the theme, click a row. Reset between each and compare with the budgets
        in the README.
      </p>
    </aside>
  );
}
