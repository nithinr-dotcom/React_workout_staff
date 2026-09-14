import { useState, type ComponentType } from 'react';
import type { StarRatingProps } from './types';

export default function Playground({ impl }: { impl: { default: ComponentType<StarRatingProps> } }) {
  const StarRating = impl.default;
  const [controlled, setControlled] = useState(3);
  const [log, setLog] = useState<number[]>([]);

  return (
    <div style={{ display: 'grid', gap: 24, maxWidth: 560 }}>
      <section>
        <h3>Uncontrolled (defaultValue=2)</h3>
        <StarRating defaultValue={2} label="Uncontrolled rating" onChange={(v) => setLog((l) => [v, ...l].slice(0, 8))} />
        <p>onChange log: {log.join(', ') || 'none'}</p>
      </section>
      <section>
        <h3>Controlled (value={controlled})</h3>
        <StarRating value={controlled} onChange={setControlled} label="Controlled rating" />
        <button type="button" onClick={() => setControlled(0)}>
          Reset from parent
        </button>
      </section>
      <section>
        <h3>max=10</h3>
        <StarRating max={10} defaultValue={7} label="Out of ten" />
      </section>
      <section>
        <h3>readOnly (value=4)</h3>
        <StarRating value={4} readOnly label="Average rating" />
      </section>
    </div>
  );
}
