import { Component, useEffect, useMemo, useState, type ReactNode } from 'react';
import { BUDGET_SHEET } from './data';
import type { SheetEngine, SpreadsheetModule } from './types';

class DemoBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    return this.state.error ? <p style={{ color: '#b91c1c' }}>Error: {this.state.error.message}</p> : this.props.children;
  }
}

function createEngine(impl: SpreadsheetModule): { engine: SheetEngine | null; error: string | null } {
  try {
    const engine = impl.createSheetEngine();
    for (const [id, raw] of Object.entries(BUDGET_SHEET)) engine.setCell(id, raw);
    return { engine, error: null };
  } catch (e) {
    return { engine: null, error: (e as Error).message };
  }
}

export default function Playground({ impl }: { impl: SpreadsheetModule }) {
  const Spreadsheet = impl.default;
  const { engine, error } = useMemo(() => createEngine(impl), [impl]);
  const [lastRecompute, setLastRecompute] = useState<string[]>([]);
  const [chainResult, setChainResult] = useState<string>('');

  useEffect(() => {
    if (!engine) return;
    try {
      return engine.subscribe((changed) => setLastRecompute(changed));
    } catch {
      return undefined;
    }
  }, [engine]);

  const runChainBenchmark = () => {
    try {
      const sheet = impl.createSheetEngine({ rows: 1000, cols: 1 });
      for (let r = 2; r <= 1000; r++) sheet.setCell(`A${r}`, `=A${r - 1}+1`);
      const t0 = performance.now();
      const changed = sheet.setCell('A1', '1');
      const ms = performance.now() - t0;
      setChainResult(`1,000-deep chain: recomputed ${changed.length} cells in ${ms.toFixed(1)} ms; A1000 = ${JSON.stringify(sheet.getValue('A1000'))}`);
    } catch (e) {
      setChainResult(`Error: ${(e as Error).message}`);
    }
  };

  return (
    <div style={{ display: 'grid', gap: 16, fontFamily: 'system-ui' }}>
      <p style={{ margin: 0 }}>
        Try editing <code>B2</code> (only D2, D6, D8, D10 should recompute), fix the <code>#DIV/0!</code> in <code>B10</code>,
        or break the cycle in <code>B12</code>.
      </p>
      {error && <p style={{ color: '#b91c1c' }}>Engine error: {error}</p>}
      <p style={{ margin: 0 }}>
        Last recompute: <code>{lastRecompute.length ? lastRecompute.join(' → ') : '—'}</code>
      </p>
      <div>
        <button type="button" onClick={runChainBenchmark}>
          Run deep-chain check
        </button>{' '}
        <span>{chainResult}</span>
      </div>
      <div style={{ overflow: 'auto', maxHeight: 520, border: '1px solid #d0d5dd' }}>
        <DemoBoundary>
          {engine ? <Spreadsheet engine={engine} aria-label="Budget" /> : <Spreadsheet initialCells={BUDGET_SHEET} aria-label="Budget" />}
        </DemoBoundary>
      </div>
    </div>
  );
}
