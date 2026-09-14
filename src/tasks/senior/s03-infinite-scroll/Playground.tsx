import { useMemo, useState, type ComponentType } from 'react';
import { getFeed } from '../../../mocks/api';
import type { FetchPage, InfiniteFeedProps } from './types';

export default function Playground({ impl }: { impl: { default: ComponentType<InfiniteFeedProps> } }) {
  const InfiniteFeed = impl.default;
  const [failRate, setFailRate] = useState(0);
  const [overlap, setOverlap] = useState(false);
  const [requests, setRequests] = useState(0);
  const [session, setSession] = useState(0);

  const fetchPage = useMemo<FetchPage>(
    () => (cursor, { signal }) => {
      setRequests((n) => n + 1);
      // "Overlap" rewinds each cursor by 3 posts, as if new posts were published between requests.
      const start = overlap && cursor ? Math.max(0, cursor - 3) : cursor;
      return getFeed({ cursor: start, limit: 10 }, { signal, failRate, latency: [300, 900] });
    },
    [failRate, overlap],
  );

  return (
    <div style={{ display: 'grid', gap: 12, maxWidth: 560 }}>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <label>
          Failure rate: {Math.round(failRate * 100)}%{' '}
          <input type="range" min={0} max={0.8} step={0.1} value={failRate} onChange={(e) => setFailRate(Number(e.target.value))} />
        </label>
        <label>
          <input type="checkbox" checked={overlap} onChange={(e) => setOverlap(e.target.checked)} /> Overlapping pages (tests dedupe)
        </label>
        <button
          type="button"
          onClick={() => {
            setRequests(0);
            setSession((s) => s + 1);
          }}
        >
          Restart feed
        </button>
        <span>
          Requests made: <strong>{requests}</strong>
        </span>
      </div>

      <div style={{ height: 520, overflowY: 'auto', border: '1px solid #d0d5dd', borderRadius: 8, padding: 12 }}>
        <InfiniteFeed key={session} fetchPage={fetchPage} label="Posts" />
      </div>
    </div>
  );
}
