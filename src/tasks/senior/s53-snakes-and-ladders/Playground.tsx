import { useState } from 'react';
import { CLASSIC_LADDERS, CLASSIC_SNAKES, QUICK_LADDERS, QUICK_SNAKES } from './data';
import type { SnakesAndLaddersModule } from './types';

const BOARDS = {
  classic: { label: 'Classic board', snakes: CLASSIC_SNAKES, ladders: CLASSIC_LADDERS },
  quick: { label: 'Quick board (long ladders)', snakes: QUICK_SNAKES, ladders: QUICK_LADDERS },
};

export default function Playground({ impl }: { impl: SnakesAndLaddersModule }) {
  const SnakesAndLadders = impl.default;
  const [boardKey, setBoardKey] = useState<keyof typeof BOARDS>('classic');
  const [players, setPlayers] = useState(2);
  const board = BOARDS[boardKey];

  let pureDemo: string;
  try {
    const after = impl.applyMove({ board: { snakes: {}, ladders: { 4: 14 } }, positions: [0, 0], current: 0, winner: null }, 4);
    pureDemo = JSON.stringify(after.positions) + `, current ${after.current}`;
  } catch (e) {
    pureDemo = `Error: ${(e as Error).message}`;
  }

  return (
    <div style={{ display: 'grid', gap: 12, maxWidth: 640 }}>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <label>
          Board{' '}
          <select value={boardKey} onChange={(e) => setBoardKey(e.target.value as keyof typeof BOARDS)}>
            {Object.entries(BOARDS).map(([key, b]) => (
              <option key={key} value={key}>
                {b.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Players{' '}
          <select value={players} onChange={(e) => setPlayers(Number(e.target.value))}>
            {[2, 3, 4].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p style={{ fontFamily: 'monospace', fontSize: 12, margin: 0 }}>
        applyMove(positions [0, 0], ladder 4→14, roll 4) → {pureDemo}
      </p>
      {/* key remounts the game when the board or player count changes */}
      <SnakesAndLadders key={`${boardKey}-${players}`} players={players} snakes={board.snakes} ladders={board.ladders} />
    </div>
  );
}
