import { useState, type ComponentType } from 'react';
import type { TrafficLightProps } from './types';

export default function Playground({ impl }: { impl: { default: ComponentType<TrafficLightProps> } }) {
  const TrafficLight = impl.default;
  const [mounted, setMounted] = useState(true);

  return (
    <div style={{ display: 'flex', gap: 48, flexWrap: 'wrap', alignItems: 'flex-start' }}>
      <section>
        <h3>Defaults (4s / 3s / 1s)</h3>
        <button type="button" onClick={() => setMounted((m) => !m)}>
          {mounted ? 'Unmount' : 'Mount'}
        </button>
        {mounted && <TrafficLight />}
      </section>
      <section>
        <h3>Fast (red 1s, green 1s, yellow 500ms)</h3>
        <TrafficLight durations={{ red: 1000, green: 1000, yellow: 500 }} />
      </section>
      <section>
        <h3>initialColor=&quot;green&quot;</h3>
        <TrafficLight initialColor="green" />
      </section>
    </div>
  );
}
