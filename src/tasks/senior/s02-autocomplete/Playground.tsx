import { useMemo, useState, type ComponentType } from 'react';
import { searchCountries } from '../../../mocks/api';
import type { AutocompleteProps, FetchSuggestions, Suggestion } from './types';

type Mode = 'normal' | 'chaotic' | 'flaky';

const MODES: { value: Mode; label: string }[] = [
  { value: 'normal', label: 'Normal (200–600 ms)' },
  { value: 'chaotic', label: 'Out of order (100–2000 ms, ignores abort)' },
  { value: 'flaky', label: 'Flaky (40% failures)' },
];

export default function Playground({ impl }: { impl: { default: ComponentType<AutocompleteProps> } }) {
  const Autocomplete = impl.default;
  const [mode, setMode] = useState<Mode>('normal');
  const [debounceMs, setDebounceMs] = useState(300);
  const [selected, setSelected] = useState<Suggestion | null>(null);
  const [log, setLog] = useState<string[]>([]);

  const fetchSuggestions = useMemo<FetchSuggestions>(() => {
    return async (query, { signal }) => {
      setLog((l) => [`→ request "${query}"`, ...l].slice(0, 10));
      const countries = await searchCountries(query, {
        // In chaotic mode the request deliberately ignores the abort signal, so only your stale-response guard helps.
        signal: mode === 'chaotic' ? undefined : signal,
        latency: mode === 'chaotic' ? [100, 2000] : [200, 600],
        failRate: mode === 'flaky' ? 0.4 : 0,
      });
      setLog((l) => [`← response "${query}" (${countries.length})${signal.aborted ? ' [aborted]' : ''}`, ...l].slice(0, 10));
      return countries.map((c) => ({ id: c.code, label: c.name }));
    };
  }, [mode]);

  return (
    <div style={{ display: 'grid', gap: 16, maxWidth: 520 }}>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <label>
          Backend:{' '}
          <select value={mode} onChange={(e) => setMode(e.target.value as Mode)}>
            {MODES.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Debounce: {debounceMs} ms{' '}
          <input type="range" min={0} max={1000} step={50} value={debounceMs} onChange={(e) => setDebounceMs(Number(e.target.value))} />
        </label>
      </div>

      {/* Remount when the backend changes so the cache starts empty. */}
      <Autocomplete
        key={mode}
        label="Country"
        placeholder="Try “in”, “land” or “united”"
        fetchSuggestions={fetchSuggestions}
        debounceMs={debounceMs}
        onSelect={setSelected}
      />

      <p>
        Selected: <strong>{selected ? `${selected.label} (${selected.id})` : 'nothing yet'}</strong>
      </p>
      <ol style={{ fontFamily: 'monospace', fontSize: 13, margin: 0 }}>
        {log.map((line, i) => (
          <li key={i}>{line}</li>
        ))}
      </ol>
    </div>
  );
}
