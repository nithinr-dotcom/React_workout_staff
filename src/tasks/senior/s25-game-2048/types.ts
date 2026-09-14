import type { ComponentType } from 'react';

/** 4 × 4 grid of tile values. `0` means empty. `board[row][column]`, row 0 at the top. */
export type Board = number[][];

export type MoveDirection = 'left' | 'right' | 'up' | 'down';

export interface MoveResult {
  /** A new board. The input is never mutated. */
  board: Board;
  /** Points gained by this move: the sum of the values of all tiles created by merges. */
  score: number;
  /** `false` when no tile moved or merged. */
  moved: boolean;
}

export interface Game2048Props {
  /** Returns a number in [0, 1). Default `Math.random`. */
  random?: () => number;
  /** Start from this board instead of an empty board with two spawned tiles. */
  initialBoard?: Board;
}

export interface Game2048Module {
  default: ComponentType<Game2048Props>;
  move(board: Board, direction: MoveDirection): MoveResult;
  /** Adds a 2 (90%) or 4 (10%) on a random empty cell. Returns a new board. */
  spawnTile(board: Board, random: () => number): Board;
  /** `true` if any tile is 2048 or more. */
  hasWon(board: Board): boolean;
  /** `true` if at least one direction would change the board. */
  canMove(board: Board): boolean;
}
