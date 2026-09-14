import { Component, useEffect, useMemo, useState, type ReactNode } from 'react';
import { getTodos, saveTodo, deleteTodo, type Todo } from '../../../mocks/api';
import type { NetworkStatus, OfflineSyncModule, SyncApi } from './types';

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

/** navigator.onLine combined with a manual "airplane mode" switch. */
function createDemoNetwork() {
  let forcedOffline = false;
  const listeners = new Set<(online: boolean) => void>();
  const isOnline = () => navigator.onLine && !forcedOffline;
  const emit = () => listeners.forEach((l) => l(isOnline()));
  window.addEventListener('online', emit);
  window.addEventListener('offline', emit);
  const network: NetworkStatus & { setForcedOffline(v: boolean): void } = {
    isOnline,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    setForcedOffline(v) {
      forcedOffline = v;
      emit();
    },
  };
  return network;
}

export default function Playground({ impl }: { impl: OfflineSyncModule }) {
  const Todos = impl.default;
  const [offline, setOffline] = useState(false);
  const [failRate, setFailRate] = useState(0.2);
  const [server, setServer] = useState<Todo[]>([]);
  const network = useMemo(() => createDemoNetwork(), []);

  const api = useMemo<SyncApi>(
    () => ({
      saveTodo: (todo) => saveTodo(todo, { latency: [300, 900], failRate }),
      deleteTodo: (id) => deleteTodo(id, { latency: [300, 900], failRate }),
      getTodos: () => getTodos({ latency: 300 }),
    }),
    [failRate],
  );

  const { engine, error } = useMemo(() => {
    try {
      return { engine: impl.createSyncEngine({ api, network }), error: null };
    } catch (e) {
      return { engine: null, error: (e as Error).message };
    }
  }, [impl, api, network]);

  useEffect(() => () => engine?.destroy(), [engine]);

  useEffect(() => {
    const id = setInterval(() => {
      getTodos({ latency: 0 }).then(setServer, () => {});
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const editElsewhere = async () => {
    const [first] = await getTodos({ latency: 0 });
    if (first) await saveTodo({ ...first, title: `${first.title} (edited on phone)`, updatedAt: Date.now() + 60_000 }, { latency: 0 });
  };

  return (
    <div style={{ fontFamily: 'system-ui', display: 'grid', gap: 16, maxWidth: 760 }}>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <label>
          <input
            type="checkbox"
            checked={offline}
            onChange={(e) => {
              setOffline(e.target.checked);
              network.setForcedOffline(e.target.checked);
            }}
          />{' '}
          Airplane mode
        </label>
        <label>
          Server fail rate {Math.round(failRate * 100)}%{' '}
          <input type="range" min={0} max={1} step={0.1} value={failRate} onChange={(e) => setFailRate(Number(e.target.value))} />
        </label>
        <button onClick={editElsewhere}>Edit first todo on “another device”</button>
      </div>
      {error && <p style={{ color: '#b91c1c' }}>Error: {error}</p>}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 3fr) minmax(0, 2fr)', gap: 16 }}>
        <section>
          <h4 style={{ margin: '0 0 8px' }}>This device</h4>
          {engine && (
            <ErrorBoundary>
              <Todos engine={engine} />
            </ErrorBoundary>
          )}
        </section>
        <section>
          <h4 style={{ margin: '0 0 8px' }}>Server (polled every 1s)</h4>
          <ul style={{ fontFamily: 'monospace', fontSize: 12, paddingLeft: 16 }}>
            {server.map((t) => (
              <li key={t.id}>
                {t.done ? '☑' : '☐'} {t.title} · {new Date(t.updatedAt).toLocaleTimeString()}
              </li>
            ))}
          </ul>
        </section>
      </div>
      <p style={{ color: '#475467', fontSize: 13 }}>
        Changing the fail rate recreates the engine: queued work should survive because the outbox is persisted.
      </p>
    </div>
  );
}
