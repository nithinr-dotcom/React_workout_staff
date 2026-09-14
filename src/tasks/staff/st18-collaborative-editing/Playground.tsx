import { Component, useState, type ReactNode } from 'react';
import type { CollabModule, Component as OpComponent, Operation } from './types';

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

function randomOp(doc: string): Operation {
  if (doc.length === 0 || Math.random() < 0.5) {
    const c: OpComponent = { type: 'insert', pos: Math.floor(Math.random() * (doc.length + 1)), text: 'xyz'[Math.floor(Math.random() * 3)] };
    return [c];
  }
  const pos = Math.floor(Math.random() * doc.length);
  return [{ type: 'delete', pos, len: 1 + Math.floor(Math.random() * Math.min(3, doc.length - pos)) }];
}

/** Quick TP1 smoke check you can run from the browser while developing. */
function Tp1Checker({ impl }: { impl: CollabModule }) {
  const [result, setResult] = useState('');
  const run = () => {
    try {
      for (let i = 0; i < 1000; i++) {
        const doc = 'hello world'.slice(0, Math.floor(Math.random() * 12));
        const a = randomOp(doc);
        const b = randomOp(doc);
        const left = impl.apply(impl.apply(doc, a), impl.transform(b, a, 'right'));
        const right = impl.apply(impl.apply(doc, b), impl.transform(a, b, 'left'));
        if (left !== right) {
          setResult(`✗ diverged on "${doc}": a=${JSON.stringify(a)} b=${JSON.stringify(b)} → "${left}" vs "${right}"`);
          return;
        }
      }
      setResult('✓ 1000 random pairs converged');
    } catch (e) {
      setResult(`Error: ${(e as Error).message}`);
    }
  };
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
      <button onClick={run}>Run TP1 check</button>
      <code>{result}</code>
    </div>
  );
}

export default function Playground({ impl }: { impl: CollabModule }) {
  const Demo = impl.default;
  const [seedText, setSeedText] = useState('The quick brown fox');
  const [key, setKey] = useState(0);
  return (
    <div style={{ fontFamily: 'system-ui', display: 'grid', gap: 16, maxWidth: 820 }}>
      <p style={{ margin: 0, color: '#475467' }}>
        Crank the delay up, type in both editors at once, and watch them converge. Try typing at the same position, and
        deleting a range while the other side types inside it.
      </p>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <label>
          Initial text <input value={seedText} onChange={(e) => setSeedText(e.target.value)} />
        </label>
        <button onClick={() => setKey((k) => k + 1)}>Restart session</button>
      </div>
      <ErrorBoundary key={key}>
        <Demo initialText={seedText} initialDelayMs={600} />
      </ErrorBoundary>
      <ErrorBoundary>
        <Tp1Checker impl={impl} />
      </ErrorBoundary>
    </div>
  );
}
