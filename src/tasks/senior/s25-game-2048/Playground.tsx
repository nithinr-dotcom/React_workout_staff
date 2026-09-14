import { useState } from 'react';
import type { Board, Game2048Module } from './types';

const PRESETS: Record<string, Board | undefined> = {
  'Random start': undefined,
  'One move from 2048': [
    [1024, 1024, 0, 0],
    [2, 4, 8, 16],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ],
  'Merge-once check (2 2 2 2 / 2 2 4 0)': [
    [2, 2, 2, 2],
    [2, 2, 4, 0],
    [4, 4, 8, 0],
    [0, 0, 0, 0],
  ],
  'Almost stuck': [
    [2, 4, 2, 4],
    [4, 2, 4, 2],
    [2, 4, 2, 4],
    [4, 2, 4, 0],
  ],
};

export default function Playground({ impl }: { impl: Game2048Module }) {
  const Game2048 = impl.default;
  const [preset, setPreset] = useState('Random start');
  const [game, setGame] = useState(0);
  return (
    <div style={{ display: 'grid', gap: 16, maxWidth: 480 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <label>
          Start from{' '}
          <select value={preset} onChange={(e) => setPreset(e.target.value)}>
            {Object.keys(PRESETS).map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
        </label>
        <button onClick={() => setGame((g) => g + 1)}>Remount</button>
      </div>
      <p style={{ margin: 0, color: '#667085', fontSize: 13 }}>
        Use the arrow keys. Click the page first so the select doesn't keep keyboard focus.
      </p>
      <Game2048 key={`${preset}-${game}`} initialBoard={PRESETS[preset]} />
    </div>
  );
}
