import type { ComponentType } from 'react';
import type { MemoryCard, MemoryGameProps } from './types';

const identity = (cards: MemoryCard[]) => cards;

export default function Playground({ impl }: { impl: { default: ComponentType<MemoryGameProps> } }) {
  const MemoryGame = impl.default;
  return (
    <div style={{ display: 'grid', gap: 24, maxWidth: 640 }}>
      <section>
        <h3>Default (8 pairs, random shuffle)</h3>
        <MemoryGame />
      </section>
      <section>
        <h3>Easy: 3 pairs, unshuffled, 500ms delay</h3>
        <MemoryGame symbols={['🍎', '🍌', '🍇']} shuffle={identity} mismatchDelay={500} />
      </section>
    </div>
  );
}
