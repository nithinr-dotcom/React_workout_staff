import { useState, type ComponentType } from 'react';
import type { TicTacToeProps } from './types';

export default function Playground({ impl }: { impl: { default: ComponentType<TicTacToeProps> } }) {
  const TicTacToe = impl.default;
  const [size, setSize] = useState(3);
  return (
    <div style={{ display: 'grid', gap: 16, maxWidth: 560 }}>
      <label>
        Board size{' '}
        <select value={size} onChange={(e) => setSize(Number(e.target.value))}>
          {[3, 4, 5].map((n) => (
            <option key={n} value={n}>
              {n}×{n}
            </option>
          ))}
        </select>
      </label>
      {/* key remounts the game when the size changes */}
      <TicTacToe key={size} size={size} />
    </div>
  );
}
