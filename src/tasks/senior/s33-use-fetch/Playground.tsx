import { Component, useState, type ReactNode } from 'react';
import { getWeather, type Weather } from '../../../mocks/api';
import { WEATHER } from '../../../mocks/data/datasets';
import type { Fetcher, UseFetchModule } from './types';

class Boundary extends Component<{ children: ReactNode; resetKey: string }, { error: string | null; resetKey: string }> {
  state = { error: null as string | null, resetKey: this.props.resetKey };
  static getDerivedStateFromError(error: Error) {
    return { error: error.message };
  }
  static getDerivedStateFromProps(
    props: { resetKey: string },
    state: { error: string | null; resetKey: string },
  ) {
    return props.resetKey !== state.resetKey ? { error: null, resetKey: props.resetKey } : null;
  }
  render() {
    if (this.state.error) return <p style={{ color: '#b91c1c' }}>Error: {this.state.error}</p>;
    return this.props.children;
  }
}

interface PanelProps {
  impl: UseFetchModule;
  label: string;
  city: string;
  enabled: boolean;
  fetcher: Fetcher<Weather>;
}

function WeatherPanel({ impl, label, city, enabled, fetcher }: PanelProps) {
  // The inline fetcher identity is intentionally new on every render of the parent.
  const { data, error, status, isValidating, refetch } = impl.useFetch(city, fetcher, { enabled });
  return (
    <section style={{ border: '1px solid #d0d5dd', borderRadius: 8, padding: 12, minWidth: 220 }}>
      <h4 style={{ margin: '0 0 8px' }}>{label}</h4>
      <p style={{ margin: 0, fontFamily: 'monospace', fontSize: 13 }}>
        status: <strong>{status}</strong> · validating: {String(isValidating)}
      </p>
      {data && (
        <p style={{ fontSize: 18, margin: '8px 0' }}>
          {data.city}: {data.tempC}°C, {data.condition}
        </p>
      )}
      {status === 'error' && <p style={{ color: '#b91c1c' }}>{(error as Error)?.message ?? String(error)}</p>}
      <button type="button" onClick={refetch}>
        refetch()
      </button>
    </section>
  );
}

export default function Playground({ impl }: { impl: UseFetchModule }) {
  const [city, setCity] = useState(WEATHER[0].city);
  const [enabled, setEnabled] = useState(true);
  const [showMirror, setShowMirror] = useState(true);
  const [latency, setLatency] = useState(800);
  const [failRate, setFailRate] = useState(0);
  const [log, setLog] = useState<string[]>([]);

  const fetcher: Fetcher<Weather> = (key, signal) => {
    const started = new Date().toLocaleTimeString();
    setLog((l) => [`${started} fetcher("${key}")`, ...l].slice(0, 12));
    signal.addEventListener('abort', () => setLog((l) => [`${new Date().toLocaleTimeString()} aborted "${key}"`, ...l].slice(0, 12)));
    return getWeather(key, { signal, latency, failRate });
  };

  return (
    <div style={{ fontFamily: 'system-ui', display: 'grid', gap: 12, maxWidth: 640 }}>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <label>
          City{' '}
          <select value={city} onChange={(e) => setCity(e.target.value)}>
            {WEATHER.map((w) => (
              <option key={w.city}>{w.city}</option>
            ))}
            <option>Atlantis</option>
          </select>
        </label>
        <label>
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} /> enabled
        </label>
        <label>
          <input type="checkbox" checked={showMirror} onChange={(e) => setShowMirror(e.target.checked)} /> mount second
          hook (same key)
        </label>
      </div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <label>
          Latency {latency}ms{' '}
          <input type="range" min={0} max={3000} step={100} value={latency} onChange={(e) => setLatency(Number(e.target.value))} />
        </label>
        <label>
          Fail rate {Math.round(failRate * 100)}%{' '}
          <input type="range" min={0} max={1} step={0.1} value={failRate} onChange={(e) => setFailRate(Number(e.target.value))} />
        </label>
        <button
          type="button"
          onClick={() => {
            try {
              impl.clearCache();
              setLog((l) => ['clearCache()', ...l]);
            } catch (e) {
              setLog((l) => [`clearCache threw: ${(e as Error).message}`, ...l]);
            }
          }}
        >
          clearCache()
        </button>
      </div>
      <p style={{ margin: 0, color: '#667085', fontSize: 13 }}>
        Try: switch cities quickly (stale responses must be ignored), switch back to a visited city (cached data should
        appear instantly), and toggle the second hook (one request, not two).
      </p>
      <Boundary resetKey={`${city}-${enabled}-${showMirror}`}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <WeatherPanel impl={impl} label="Hook A" city={city} enabled={enabled} fetcher={fetcher} />
          {showMirror && <WeatherPanel impl={impl} label="Hook B" city={city} enabled={enabled} fetcher={fetcher} />}
        </div>
      </Boundary>
      <ol style={{ fontFamily: 'monospace', fontSize: 13 }}>
        {log.map((l, i) => (
          <li key={i}>{l}</li>
        ))}
      </ol>
    </div>
  );
}
