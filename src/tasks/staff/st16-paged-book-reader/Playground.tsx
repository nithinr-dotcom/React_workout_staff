import { Component, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createFakeBookApi, type RequestLogEntry } from './server';
import type { BookReaderModule } from './types';

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) return <p style={{ color: '#b91c1c' }}>Error: {this.state.error.message}</p>;
    return this.props.children;
  }
}

const STATUS_COLOR: Record<RequestLogEntry['status'], string> = {
  pending: '#475467',
  done: '#067647',
  aborted: '#b54708',
  failed: '#b91c1c',
};

export default function Playground({ impl }: { impl: BookReaderModule }) {
  const BookReader = impl.default;
  const [latency, setLatency] = useState(600);
  const [failRate, setFailRate] = useState(0.1);
  const [log, setLog] = useState<RequestLogEntry[]>([]);
  const settings = useRef({ latency, failRate });
  useEffect(() => {
    settings.current = { latency, failRate };
  }, [latency, failRate]);

  const api = useMemo(
    () =>
      createFakeBookApi({
        latency: () => [settings.current.latency * 0.5, settings.current.latency * 1.5],
        failRate: () => settings.current.failRate,
        onLog: (entry) =>
          setLog((prev) => {
            const next = prev.filter((e) => e.id !== entry.id);
            return [entry, ...next].slice(0, 40);
          }),
      }),
    [],
  );

  const counts = log.reduce<Record<string, number>>((acc, e) => ({ ...acc, [e.status]: (acc[e.status] ?? 0) + 1 }), {});

  return (
    <div style={{ fontFamily: 'system-ui', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 280px', gap: 16 }}>
      <div style={{ display: 'grid', gap: 12, alignContent: 'start' }}>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <label>
            Latency ~{latency} ms{' '}
            <input type="range" min={0} max={3000} step={100} value={latency} onChange={(e) => setLatency(Number(e.target.value))} />
          </label>
          <label>
            Page failure rate {Math.round(failRate * 100)}%{' '}
            <input type="range" min={0} max={1} step={0.05} value={failRate} onChange={(e) => setFailRate(Number(e.target.value))} />
          </label>
        </div>
        <p style={{ margin: 0, color: '#475467' }}>
          Open a book, drag the scrollbar fast, and watch the request log: skipped pages should show up as aborted (or never
          appear), and scrolling back to recent pages should not trigger new requests.
        </p>
        <ErrorBoundary>
          <BookReader api={api} pageHeight={420} />
        </ErrorBoundary>
      </div>
      <aside style={{ fontSize: 12 }}>
        <h4 style={{ margin: '0 0 8px' }}>Request log</h4>
        <p style={{ margin: '0 0 8px' }}>
          pending {counts.pending ?? 0} · done {counts.done ?? 0} · aborted {counts.aborted ?? 0} · failed {counts.failed ?? 0}
        </p>
        <ol style={{ fontFamily: 'monospace', margin: 0, paddingLeft: 16 }}>
          {log.map((e) => (
            <li key={e.id} style={{ color: STATUS_COLOR[e.status] }}>
              {e.label} · {e.status}
            </li>
          ))}
        </ol>
      </aside>
    </div>
  );
}
