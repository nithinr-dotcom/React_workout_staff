import { useMemo, useState } from 'react';
import type { Balances, ExpenseSplitterModule } from './types';

const SAMPLE: Balances = { Asha: 70000, Ben: -30000, Chen: -25000, Dev: -15000, Esha: 0 };

export default function Playground({ impl }: { impl: ExpenseSplitterModule }) {
  const ExpenseSplitter = impl.default;
  const [json, setJson] = useState(JSON.stringify(SAMPLE, null, 2));
  const [session, setSession] = useState(0);

  const result = useMemo(() => {
    try {
      return { ok: true as const, value: impl.simplifyDebts(JSON.parse(json)) };
    } catch (e) {
      return { ok: false as const, error: (e as Error).message };
    }
  }, [impl, json]);

  return (
    <div style={{ display: 'grid', gap: 32 }}>
      <section>
        <h3>App</h3>
        <button type="button" onClick={() => setSession((s) => s + 1)}>
          Remount (clears state)
        </button>
        <div style={{ marginTop: 12 }}>
          <ExpenseSplitter key={session} />
        </div>
      </section>
      <section style={{ display: 'grid', gap: 8, maxWidth: 560 }}>
        <h3>simplifyDebts(balances)</h3>
        <label htmlFor="balances-json">Balances in paise (JSON, must sum to 0)</label>
        <textarea
          id="balances-json"
          rows={8}
          style={{ fontFamily: 'monospace' }}
          value={json}
          onChange={(e) => setJson(e.target.value)}
        />
        {result.ok ? (
          <ol style={{ fontFamily: 'monospace' }}>
            {result.value.map((s, i) => (
              <li key={i}>
                {s.from} pays {s.to} ₹{(s.amount / 100).toFixed(2)}
              </li>
            ))}
          </ol>
        ) : (
          <p style={{ color: '#b91c1c' }}>Error: {result.error}</p>
        )}
      </section>
    </div>
  );
}
