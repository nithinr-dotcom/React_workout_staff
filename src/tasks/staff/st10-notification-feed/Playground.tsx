import { Component, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { MockSocket } from '../../../mocks/mockSocket';
import type { NotificationMessage, NotificationFeedModule, NotificationStore } from './types';

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

function HeaderBadge({ store }: { store: NotificationStore }) {
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot);
  return (
    <span style={{ background: '#4f46e5', color: 'white', borderRadius: 999, padding: '2px 10px', fontSize: 13 }}>
      🔔 {snapshot.unreadCount}
    </span>
  );
}

export default function Playground({ impl }: { impl: NotificationFeedModule }) {
  const Feed = impl.default;
  const [burstEvery, setBurstEvery] = useState(3);
  const [connections, setConnections] = useState(0);
  const socketRef = useRef<MockSocket | null>(null);

  const { store, error } = useMemo(() => {
    try {
      return { store: impl.createNotificationStore({ cap: 50 }), error: null };
    } catch (e) {
      return { store: null, error: (e as Error).message };
    }
  }, [impl]);

  const createSocket = useMemo(
    () => () => {
      const socket = new MockSocket('notifications', { intervalMs: 1200, burstEvery, burstSize: 15 });
      socketRef.current = socket;
      // Deferred: the feed may call this during an effect or render.
      queueMicrotask(() => setConnections((n) => n + 1));
      return socket;
    },
    [burstEvery],
  );

  const fetchMissed = async (since: number): Promise<NotificationMessage[]> => {
    await new Promise((r) => setTimeout(r, 300));
    const now = Date.now();
    return [
      { type: 'notification', id: `missed-${since}-1`, kind: 'deploy', title: 'Deployed while you were offline', createdAt: Math.min(now - 2000, since + 1) },
      { type: 'notification', id: `missed-${since}-2`, kind: 'mention', title: 'Mentioned while you were offline', createdAt: now - 1000 },
    ];
  };

  return (
    <div style={{ fontFamily: 'system-ui', display: 'grid', gap: 12, maxWidth: 560 }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <label>
          Burst every{' '}
          <select value={burstEvery} onChange={(e) => setBurstEvery(Number(e.target.value))}>
            <option value={0}>never</option>
            <option value={3}>3 ticks (15 msgs)</option>
            <option value={1}>every tick (15 msgs)</option>
          </select>
        </label>
        <button onClick={() => socketRef.current?.simulateDrop()}>Simulate network drop</button>
        <span style={{ color: '#475467' }}>Sockets created: {connections}</span>
        {store && (
          <ErrorBoundary>
            <HeaderBadge store={store} />
          </ErrorBoundary>
        )}
      </div>
      {error && <p style={{ color: '#b91c1c' }}>Error: {error}</p>}
      <ErrorBoundary>
        <Feed key={burstEvery} createSocket={createSocket} fetchMissed={fetchMissed} store={store ?? undefined} />
      </ErrorBoundary>
    </div>
  );
}
