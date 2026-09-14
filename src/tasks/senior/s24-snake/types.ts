import type { ComponentType } from 'react';

export type Direction = 'up' | 'down' | 'left' | 'right';

/** `x` is the column (0 = left), `y` is the row (0 = top). */
export interface Point {
  x: number;
  y: number;
}

export interface SnakeState {
  /** The grid is `size × size`. */
  size: number;
  /** Head first, tail last. */
  snake: Point[];
  /** The direction the snake moved on the last step. */
  direction: Direction;
  /** `null` only when there is no free cell left. */
  food: Point | null;
  score: number;
  status: 'playing' | 'over';
}

export interface SnakeProps {
  /** Grid size. Default 15. */
  size?: number;
  /** Milliseconds between steps. Default 150. */
  tickMs?: number;
  /** Returns a number in [0, 1). Default `Math.random`. Used for food placement. */
  random?: () => number;
}

export interface SnakeModule {
  default: ComponentType<SnakeProps>;
  createInitialState(size: number, random?: () => number): SnakeState;
  /** Advances the game by one tick. Never mutates `state`. */
  step(state: SnakeState, direction: Direction, random?: () => number): SnakeState;
  /** Picks a free cell for food, or `null` when the snake fills the grid. */
  placeFood(snake: Point[], size: number, random: () => number): Point | null;
}
