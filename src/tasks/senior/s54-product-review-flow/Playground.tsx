import { useEffect, useRef, useState, type ComponentType } from 'react';
import { createReviewServer, type ServerKnobs } from './server';
import type { ProductReviewFlowProps } from './types';

export default function Playground({ impl }: { impl: { default: ComponentType<ProductReviewFlowProps> } }) {
  const ProductReviewFlow = impl.default;
  const [failRate, setFailRate] = useState(0);
  const [latency, setLatency] = useState(800);
  const [session, setSession] = useState(0);

  // Knobs are read at call time, so the api object stays stable and changing a knob doesn't refetch.
  const knobs = useRef<ServerKnobs>({ failRate, latency });
  useEffect(() => {
    knobs.current = { failRate, latency };
  }, [failRate, latency]);
  const [api] = useState(() => createReviewServer(() => knobs.current));

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center' }}>
        <label>
          Failure rate{' '}
          <select value={failRate} onChange={(e) => setFailRate(Number(e.target.value))}>
            <option value={0}>0%</option>
            <option value={0.3}>30%</option>
            <option value={1}>100%</option>
          </select>
        </label>
        <label>
          Latency{' '}
          <select value={latency} onChange={(e) => setLatency(Number(e.target.value))}>
            <option value={100}>100 ms</option>
            <option value={800}>800 ms</option>
            <option value={2500}>2.5 s</option>
          </select>
        </label>
        <button
          type="button"
          onClick={() => {
            api.reset();
            localStorage.removeItem('playground-review-drafts');
            setSession((s) => s + 1);
          }}
        >
          Reset data, clear drafts &amp; remount
        </button>
      </div>
      <p style={{ margin: 0, color: '#667085', fontSize: 13 }}>
        Tip: start with 100% failures to see the error state, then set 0% and press Retry. Type a draft, switch
        products, then remount to check the drafts survive.
      </p>
      <ProductReviewFlow key={session} api={api} storageKey="playground-review-drafts" />
    </div>
  );
}
