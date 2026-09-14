import { useState } from 'react';
import type { HighlighterModule, Segment } from './types';

const ARTICLES = [
  {
    title: 'How do I request a refund?',
    snippet:
      'Refunds for annual plans are prorated. Open Billing → Invoices, choose the invoice and click "Request refund". Refunds reach your card in 5-7 business days.',
  },
  {
    title: 'Pricing: why was I charged $5.00?',
    snippet:
      'A $5.00 (approx.) authorisation hold verifies your card when you start a trial. It is released automatically. It is not a charge.',
  },
  {
    title: 'Using the API with C++ or C#',
    snippet:
      'Official SDKs exist for C++ and C#. For other languages call the REST API directly. Rate limits: 100 requests/min per token.',
  },
  {
    title: 'Two-factor authentication (2FA)',
    snippet:
      'Enable 2FA under Security. We support authenticator apps and hardware keys. SMS codes are deprecated and will be removed in 2027.',
  },
];

const PRESETS = ['refund', 'c++', '$5.00 (approx.)', 'auth api', 'aa', 'e man'];

function run<T>(fn: () => T): { value: T | null; error: string | null } {
  try {
    return { value: fn(), error: null };
  } catch (e) {
    return { value: null, error: (e as Error).message };
  }
}

export default function Playground({ impl }: { impl: HighlighterModule }) {
  const Highlighter = impl.default;
  const [query, setQuery] = useState('refund');
  const terms = query.split(/\s+/).filter(Boolean);
  const segments = run<Segment[]>(() => impl.highlight(ARTICLES[0].snippet, terms));

  return (
    <div style={{ display: 'grid', gap: 20, maxWidth: 720 }}>
      <label style={{ display: 'grid', gap: 4 }}>
        Search the help centre
        <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Try: refund, c++, $5.00" />
      </label>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {PRESETS.map((p) => (
          <button key={p} type="button" onClick={() => setQuery(p)}>
            {p}
          </button>
        ))}
      </div>

      <ul style={{ display: 'grid', gap: 12, listStyle: 'none', padding: 0, margin: 0 }}>
        {ARTICLES.map((a) => (
          <li key={a.title} style={{ border: '1px solid #d0d5dd', borderRadius: 8, padding: 12 }}>
            <strong>
              <Highlighter text={a.title} query={query} />
            </strong>
            <p style={{ margin: '6px 0 0' }}>
              <Highlighter text={a.snippet} query={query} />
            </p>
          </li>
        ))}
      </ul>

      <section>
        <h3>highlight(firstSnippet, {JSON.stringify(terms)})</h3>
        {segments.error ? (
          <p style={{ color: '#b42318' }}>{segments.error}</p>
        ) : (
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12 }}>{JSON.stringify(segments.value, null, 2)}</pre>
        )}
      </section>
    </div>
  );
}
