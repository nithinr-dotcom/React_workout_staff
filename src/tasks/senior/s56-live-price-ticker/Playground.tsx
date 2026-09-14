import { useMemo, useState } from 'react';
import { createFakeFeed, INSTRUMENTS } from './data';
import type { PriceTickerModule } from './types';

const SPEEDS = [
  { label: 'Calm (1 tick / 500ms)', intervalMs: 500, burstSize: 1 },
  { label: 'Busy (12 ticks / 250ms)', intervalMs: 250, burstSize: 12 },
  { label: 'Firehose (200 ticks / 20ms)', intervalMs: 20, burstSize: 200 },
];

export default function Playground({ impl }: { impl: PriceTickerModule }) {
  const PriceTicker = impl.default;
  const [speed, setSpeed] = useState(1);
  const subscribe = useMemo(() => {
    const { intervalMs, burstSize } = SPEEDS[speed];
    return createFakeFeed(INSTRUMENTS, { intervalMs, burstSize, volatility: 0.003 });
  }, [speed]);

  return (
    <div style={{ display: 'grid', gap: 12, maxWidth: 720 }}>
      <label>
        Feed speed{' '}
        <select value={speed} onChange={(e) => setSpeed(Number(e.target.value))}>
          {SPEEDS.map((s, i) => (
            <option key={s.label} value={i}>
              {s.label}
            </option>
          ))}
        </select>
      </label>
      <p style={{ margin: 0 }}>
        Open the React DevTools Profiler on &quot;Firehose&quot;: commits should stay at one per frame or fewer.
      </p>
      <PriceTicker instruments={INSTRUMENTS} subscribe={subscribe} />
    </div>
  );
}
