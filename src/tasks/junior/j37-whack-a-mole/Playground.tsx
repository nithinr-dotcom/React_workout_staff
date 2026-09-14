import type { ComponentType } from 'react';
import type { WhackAMoleProps } from './types';

export default function Playground({ impl }: { impl: { default: ComponentType<WhackAMoleProps> } }) {
  const WhackAMole = impl.default;
  return (
    <div style={{ display: 'grid', gap: 32, maxWidth: 560 }}>
      <section>
        <h3>Default (30s, a mole every second, up for 700ms)</h3>
        <WhackAMole />
      </section>
      <section>
        <h3>Quick round: 10s, fast moles (600ms / 400ms)</h3>
        <WhackAMole duration={10} popInterval={600} upTime={400} />
      </section>
    </div>
  );
}
