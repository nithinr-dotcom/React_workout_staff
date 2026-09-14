import { useState, type ComponentType } from 'react';
import type { ClockMode, ClockProps } from './types';

// Starts at 23:59:50 local time and runs forward, so you can watch the day roll over.
const START = new Date();
START.setHours(23, 59, 50, 0);
const OFFSET = START.getTime() - Date.now();
const nearMidnight = () => new Date(Date.now() + OFFSET);

export default function Playground({ impl }: { impl: { default: ComponentType<ClockProps> } }) {
  const Clock = impl.default;
  const [mode, setMode] = useState<ClockMode>('digital');
  return (
    <div style={{ display: 'grid', gap: 24, maxWidth: 560 }}>
      <section>
        <h3>Current time</h3>
        <label>
          Mode{' '}
          <select value={mode} onChange={(e) => setMode(e.target.value as ClockMode)}>
            <option value="digital">digital</option>
            <option value="analog">analog</option>
          </select>
        </label>
        <Clock mode={mode} />
      </section>
      <section>
        <h3>Injected clock starting at 23:59:50</h3>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          <Clock mode="digital" now={nearMidnight} />
          <Clock mode="analog" now={nearMidnight} />
        </div>
      </section>
      <section>
        <h3>Follow-up 1: Tokyo and New York</h3>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          <Clock mode="digital" timeZone="Asia/Tokyo" />
          <Clock mode="digital" timeZone="America/New_York" />
        </div>
      </section>
    </div>
  );
}
