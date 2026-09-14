import type { ComponentType } from 'react';
import type { GridLightsProps } from './types';

const PLUS: (0 | 1)[][] = [
  [0, 1, 0],
  [1, 1, 1],
  [0, 1, 0],
];

export default function Playground({ impl }: { impl: { default: ComponentType<GridLightsProps> } }) {
  const GridLights = impl.default;
  return (
    <div style={{ display: 'grid', gap: 24, maxWidth: 560 }}>
      <section>
        <h3>Default (3×3 without centre, 300ms)</h3>
        <GridLights />
      </section>
      <section>
        <h3>Plus shape, 600ms</h3>
        <GridLights config={PLUS} interval={600} />
      </section>
    </div>
  );
}
