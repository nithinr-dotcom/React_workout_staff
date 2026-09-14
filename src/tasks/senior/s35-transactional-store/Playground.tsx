import { useMemo, useState, type FormEvent } from 'react';
import type { TransactionalStore, TransactionalStoreModule } from './types';

interface LogLine {
  input: string;
  output: string;
  kind: 'ok' | 'error';
}

const SCRIPT = ['SET a 10', 'BEGIN', 'SET a 20', 'BEGIN', 'DELETE a', 'COUNT 10', 'ROLLBACK', 'GET a', 'COMMIT', 'GET a', 'ROLLBACK'];

/** Parses a command locally, so the Playground works even before follow-up 1 (`execute`) is implemented. */
function runCommand(store: TransactionalStore, line: string): string {
  const [rawCmd = '', key = '', value = ''] = line.trim().split(/\s+/);
  switch (rawCmd.toUpperCase()) {
    case 'SET':
      store.set(key, value);
      return 'OK';
    case 'GET':
      return store.get(key) ?? 'NULL';
    case 'DELETE':
      return String(store.delete(key));
    case 'COUNT':
      return String(store.count(key));
    case 'BEGIN':
      store.begin();
      return `depth ${store.depth()}`;
    case 'COMMIT':
      store.commit();
      return `depth ${store.depth()}`;
    case 'ROLLBACK':
      store.rollback();
      return `depth ${store.depth()}`;
    default:
      return `Unknown command "${rawCmd}"`;
  }
}

export default function Playground({ impl }: { impl: TransactionalStoreModule }) {
  const [generation, setGeneration] = useState(0);
  const { store, createError } = useMemo(() => {
    void generation;
    try {
      return { store: impl.createStore(), createError: null };
    } catch (e) {
      return { store: null, createError: (e as Error).message };
    }
  }, [impl, generation]);
  const [input, setInput] = useState('');
  const [log, setLog] = useState<LogLine[]>([]);

  const exec = (line: string) => {
    if (!store || !line.trim()) return;
    try {
      setLog((l) => [...l, { input: line, output: runCommand(store, line), kind: 'ok' as const }].slice(-40));
    } catch (e) {
      setLog((l) => [...l, { input: line, output: (e as Error).message, kind: 'error' as const }].slice(-40));
    }
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    exec(input);
    setInput('');
  };

  return (
    <div style={{ fontFamily: 'system-ui', display: 'grid', gap: 12, maxWidth: 560 }}>
      <p style={{ margin: 0, color: '#667085', fontSize: 13 }}>
        Commands: SET k v · GET k · DELETE k · COUNT v · BEGIN · COMMIT · ROLLBACK
      </p>
      {createError && <p style={{ color: '#b91c1c' }}>Error: {createError}</p>}
      <form onSubmit={onSubmit} style={{ display: 'flex', gap: 8 }}>
        <input
          aria-label="Command"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="SET a 10"
          style={{ flex: 1, padding: 8, fontFamily: 'monospace' }}
        />
        <button type="submit">Run</button>
      </form>
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" onClick={() => SCRIPT.forEach(exec)}>
          Run example script
        </button>
        <button
          type="button"
          onClick={() => {
            setGeneration((g) => g + 1);
            setLog([]);
          }}
        >
          New store
        </button>
      </div>
      <pre style={{ background: '#0f172a', color: '#e2e8f0', padding: 12, borderRadius: 8, minHeight: 160, margin: 0 }}>
        {log.map((l, i) => (
          <div key={i}>
            <span style={{ color: '#94a3b8' }}>&gt; {l.input}</span>
            {'\n'}
            <span style={{ color: l.kind === 'error' ? '#fca5a5' : '#86efac' }}>{l.output}</span>
          </div>
        ))}
      </pre>
    </div>
  );
}
