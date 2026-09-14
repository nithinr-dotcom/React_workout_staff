import { useState, type ComponentType } from 'react';
import type { ProgressQueueProps } from './types';

export default function Playground({ impl }: { impl: { default: ComponentType<ProgressQueueProps> } }) {
  const ProgressQueue = impl.default;
  const [duration, setDuration] = useState(2000);
  const [concurrency, setConcurrency] = useState(3);

  return (
    <div style={{ display: 'grid', gap: 16, maxWidth: 560 }}>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <label>
          Duration: {duration}ms{' '}
          <input
            type="range"
            min={500}
            max={5000}
            step={250}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
          />
        </label>
        <label>
          Concurrency{' '}
          <select value={concurrency} onChange={(e) => setConcurrency(Number(e.target.value))}>
            {[1, 2, 3, 5].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p style={{ margin: 0, color: '#667085' }}>
        Click Add quickly several times. Try changing concurrency while bars are running.
      </p>
      <ProgressQueue duration={duration} concurrency={concurrency} />
    </div>
  );
}
