import type { ComponentType } from 'react';

/** `{ from: to }`. Ladders go up (`to > from`), snakes go down (`to < from`). Squares are 1–100. */
export type Jumps = Record<number, number>;

export interface Board {
  snakes: Jumps;
  ladders: Jumps;
}

export interface GameState {
  board: Board;
  /** Square of each player: index 0 is Player 1. `0` means the player hasn't entered the board yet. */
  positions: number[];
  /** Index into `positions` of the player whose turn it is. */
  current: number;
  /** Index of the player who reached 100, or `null` while the game is running. */
  winner: number | null;
}

export interface SnakesAndLaddersProps {
  /** 2–4. Default 2. */
  players?: number;
  snakes: Jumps;
  ladders: Jumps;
  /** Returns a number in [0, 1). A roll is `Math.floor(random() * 6) + 1`. Default `Math.random`. */
  random?: () => number;
}

export interface SnakesAndLaddersModule {
  default: ComponentType<SnakesAndLaddersProps>;
  /** Applies one roll (1–6) for `state.current`. Returns a NEW state and never mutates the input. */
  applyMove(state: GameState, roll: number): GameState;
}
