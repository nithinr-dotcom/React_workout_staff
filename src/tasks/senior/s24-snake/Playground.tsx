import { useState } from 'react';
import type { SnakeModule } from './types';

const SPEEDS = { Slow: 250, Normal: 150, Fast: 80 } as const;

export default function Playground({ impl }: { impl: SnakeModule }) {
  const Snake = impl.default;
  const [size, setSize] = useState(15);
  const [speed, setSpeed] = useState<keyof typeof SPEEDS>('Normal');
  return (
    <div style={{ display: 'grid', gap: 16, maxWidth: 560 }}>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <label>
          Grid{' '}
          <select value={size} onChange={(e) => setSize(Number(e.target.value))}>
            {[10, 15, 20].map((n) => (
              <option key={n} value={n}>
                {n}×{n}
              </option>
            ))}
          </select>
        </label>
        <label>
          Speed{' '}
          <select value={speed} onChange={(e) => setSpeed(e.target.value as keyof typeof SPEEDS)}>
            {Object.keys(SPEEDS).map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
      </div>
      <p style={{ margin: 0, color: '#667085', fontSize: 13 }}>
        Arrow keys or WASD to steer, Space to pause. Blur the selects first (click the page) so keys reach the game.
      </p>
      {/* key remounts the game when settings change */}
      <Snake key={`${size}-${speed}`} size={size} tickMs={SPEEDS[speed]} />
    </div>
  );
}
