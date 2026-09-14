import { Component, useEffect, useMemo, useState, type ReactNode } from 'react';
import { BOOTSTRAP, DEMO_USERS, mockConnect, mockFetchFlags, publishDefinitions } from './data';
import type { ExposureEvent, FeatureFlagsModule } from './types';

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

export default function Playground({ impl }: { impl: FeatureFlagsModule }) {
  const [userIndex, setUserIndex] = useState(0);
  const [exposures, setExposures] = useState<string[]>([]);
  const user = DEMO_USERS[userIndex];

  const { client, error } = useMemo(() => {
    try {
      return {
        client: impl.createFlagClient({ bootstrap: BOOTSTRAP, fetchFlags: mockFetchFlags, connect: mockConnect }),
        error: null,
      };
    } catch (e) {
      return { client: null, error: (e as Error).message };
    }
  }, [impl]);

  useEffect(() => () => client?.destroy(), [client]);

  const onExposure = (event: ExposureEvent) =>
    setExposures((log) =>
      [`${new Date().toLocaleTimeString()} ${event.flagKey} = ${String(event.value)} (${event.userId ?? 'anon'})`, ...log].slice(0, 10),
    );

  const buckets = (() => {
    try {
      return user.id ? `bucket(new-checkout) = ${impl.getBucket('new-checkout', user.id)}` : 'anonymous: no bucket';
    } catch (e) {
      return `Error: ${(e as Error).message}`;
    }
  })();

  return (
    <div style={{ fontFamily: 'system-ui', display: 'grid', gap: 16, maxWidth: 640 }}>
      <label>
        Signed-in user{' '}
        <select value={userIndex} onChange={(e) => setUserIndex(Number(e.target.value))}>
          {DEMO_USERS.map((u, i) => (
            <option key={u.label} value={i}>
              {u.label}
            </option>
          ))}
        </select>
      </label>
      <p style={{ margin: 0, color: '#475467' }}>{buckets}</p>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button
          onClick={() =>
            publishDefinitions((defs) =>
              defs.map((d) => (d.key === 'new-checkout' ? { ...d, enabled: d.enabled === false } : d)),
            )
          }
        >
          Toggle new-checkout kill switch (live push)
        </button>
        <button
          onClick={() =>
            publishDefinitions((defs) =>
              defs.map((d) =>
                d.key === 'pricing-page-variant'
                  ? { ...d, rules: d.rules.map((r) => (r.percentage !== undefined ? { ...r, percentage: r.percentage === 100 ? 33 : 100 } : r)) }
                  : d,
              ),
            )
          }
        >
          Flip pricing rollout 33% ↔ 100%
        </button>
      </div>

      {error && <p style={{ color: '#b91c1c' }}>Error: {error}</p>}
      {client && (
        <ErrorBoundary>
          <impl.FlagProvider client={client} user={user} onExposure={onExposure}>
            <Demo impl={impl} />
          </impl.FlagProvider>
        </ErrorBoundary>
      )}

      <section>
        <h4 style={{ margin: '8px 0' }}>Exposure log</h4>
        <ol style={{ fontFamily: 'monospace', fontSize: 13 }}>
          {exposures.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ol>
      </section>
    </div>
  );
}

function Demo({ impl }: { impl: FeatureFlagsModule }) {
  const variant = impl.useFlag('pricing-page-variant', 'control');
  const perPage = impl.useFlag('search-results-per-page', 20);
  return (
    <div style={{ border: '1px solid #d0d5dd', borderRadius: 8, padding: 16, display: 'grid', gap: 8 }}>
      <impl.Feature flag="new-checkout" fallback={<p>🛒 Classic checkout</p>}>
        <p>✨ New one-page checkout</p>
      </impl.Feature>
      <p>Pricing page variant: {variant}</p>
      <p>Search results per page: {perPage}</p>
    </div>
  );
}
