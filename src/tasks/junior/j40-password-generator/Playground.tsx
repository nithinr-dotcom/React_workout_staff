import type { ComponentType } from 'react';
import type { PasswordGeneratorProps } from './types';

/** Tiny seeded PRNG (mulberry32) so the "repeatable" demo produces the same passwords after every reload. */
function seeded(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export default function Playground({ impl }: { impl: { default: ComponentType<PasswordGeneratorProps> } }) {
  const PasswordGenerator = impl.default;
  return (
    <div style={{ display: 'grid', gap: 32, maxWidth: 480 }}>
      <section>
        <h3>Default (Math.random, length 12)</h3>
        <PasswordGenerator />
      </section>
      <section>
        <h3>Seeded random, defaultLength=6</h3>
        <PasswordGenerator random={seeded(42)} defaultLength={6} />
      </section>
    </div>
  );
}
