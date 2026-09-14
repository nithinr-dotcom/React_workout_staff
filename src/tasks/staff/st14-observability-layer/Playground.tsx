import { Component, useEffect, useRef, useState, type ReactNode } from 'react';
import type { ObsEvent, ObservabilityClient, ObservabilityModule } from './types';

class Boundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) return <p style={{ color: '#b91c1c' }}>Error: {this.state.error.message}</p>;
    return this.props.children;
  }
}

function CheckoutWidget({ explode }: { explode: boolean }) {
  if (explode) throw new Error('Cannot read properties of undefined (reading "total")');
  return <p>🛒 Checkout widget is healthy.</p>;
}

function Fallback({ error, reset }: { error: Error; reset: () => void }) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => ref.current?.focus(), []);
  return (
    <div role="alert" style={{ background: '#fef3f2', padding: 12, borderRadius: 8 }}>
      <p style={{ margin: '0 0 8px' }}>Something broke: {error.message}</p>
      <button ref={ref} onClick={reset}>
        Try again
      </button>
    </div>
  );
}

function Demo({ impl, client }: { impl: ObservabilityModule; client: ObservabilityClient }) {
  const track = impl.useTrackEvent();
  const [explode, setExplode] = useState(false);
  const ErrorBoundary = impl.ErrorBoundary;

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <button onClick={() => track('add_to_cart', { sku: 'SKU-42', email: 'priya@example.com' })}>Track add_to_cart (with PII)</button>
        <button onClick={() => client.captureError(new Error('Manual capture: payment declined'))}>captureError()</button>
        <button
          onClick={() =>
            setTimeout(() => {
              throw new Error('Timer threw (window.error)');
            })
          }
        >
          Throw in setTimeout
        </button>
        <button onClick={() => void Promise.reject(new Error('Unhandled promise rejection'))}>Unhandled rejection</button>
        <button onClick={() => client.addBreadcrumb({ type: 'navigation', message: '/cart → /checkout' })}>Navigation crumb</button>
        <button onClick={() => setExplode(true)}>Break checkout widget</button>
        <button onClick={() => void client.flush()}>flush()</button>
      </div>
      <ErrorBoundary resetKeys={[explode]} onReset={() => setExplode(false)} fallback={(props) => <Fallback {...props} />}>
        <CheckoutWidget explode={explode} />
      </ErrorBoundary>
    </div>
  );
}

export default function Playground({ impl }: { impl: ObservabilityModule }) {
  const [batches, setBatches] = useState<{ at: string; events: ObsEvent[] }[]>([]);
  const [state] = useState<{ client: ObservabilityClient | null; error: string | null }>(() => {
    try {
      const client = impl.createObservability({
        flushAt: 5,
        flushIntervalMs: 4000,
        maxBreadcrumbs: 5,
        sampleRate: 1,
        transport: (events) => {
          setBatches((b) => [{ at: new Date().toLocaleTimeString(), events }, ...b].slice(0, 10));
        },
      });
      return { client, error: null };
    } catch (e) {
      return { client: null, error: (e as Error).message };
    }
  });
  const Provider = impl.ObservabilityProvider;

  if (!state.client) return <p style={{ color: '#b91c1c' }}>Error: {state.error}</p>;
  return (
    <div style={{ fontFamily: 'system-ui', display: 'grid', gap: 16, maxWidth: 820 }}>
      <Boundary>
        <Provider client={state.client}>
          <Demo impl={impl} client={state.client} />
        </Provider>
      </Boundary>
      <section>
        <h3>Transport batches (flushAt 5, every 4s, on pagehide)</h3>
        {batches.length === 0 && <p style={{ color: '#667085' }}>Nothing sent yet.</p>}
        {batches.map((batch, i) => (
          <details key={i} open={i === 0}>
            <summary>
              {batch.at}: {batch.events.length} event(s)
            </summary>
            <pre style={{ fontSize: 12, maxHeight: 240, overflow: 'auto', background: '#f9fafb', padding: 8 }}>
              {JSON.stringify(batch.events, null, 2)}
            </pre>
          </details>
        ))}
      </section>
    </div>
  );
}
