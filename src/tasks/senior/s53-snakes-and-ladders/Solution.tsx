import type { GameState, SnakesAndLaddersProps } from './types';
import styles from './Solution.module.css';

// ⬇ Delete this line when you start. Tests for this task are skipped while it exists.
export const NOT_STARTED = true;

export function applyMove(state: GameState, roll: number): GameState {
  // Your implementation here. Requirements are in README.md.
  void state;
  void roll;
  throw new Error('applyMove: not implemented');
}

export default function SnakesAndLadders({ players = 2, snakes, ladders, random = Math.random }: SnakesAndLaddersProps) {
  // Your implementation here. Requirements are in README.md.
  void snakes;
  void ladders;
  void random;
  return <div className={styles.root}>Snakes & Ladders for {players} players: start coding in Solution.tsx</div>;
}
