import type { Board, Game2048Props, MoveDirection, MoveResult } from './types';
import styles from './Solution.module.css';

// ⬇ Delete this line when you start. Tests for this task are skipped while it exists.
export const NOT_STARTED = true;

export function move(board: Board, direction: MoveDirection): MoveResult {
  // Your implementation here. Requirements are in README.md.
  void board;
  void direction;
  throw new Error('move: not implemented');
}

export function spawnTile(board: Board, random: () => number): Board {
  void board;
  void random;
  throw new Error('spawnTile: not implemented');
}

export function hasWon(board: Board): boolean {
  void board;
  throw new Error('hasWon: not implemented');
}

export function canMove(board: Board): boolean {
  void board;
  throw new Error('canMove: not implemented');
}

export default function Game2048({ random = Math.random, initialBoard }: Game2048Props) {
  // Your implementation here. Requirements are in README.md.
  void random;
  void initialBoard;
  return <div className={styles.root}>2048: start coding in Solution.tsx</div>;
}
