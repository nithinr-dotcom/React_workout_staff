import type { Board, ConnectFourProps, Player } from './types';
import styles from './Solution.module.css';

// ⬇ Delete this line when you start. Tests for this task are skipped while it exists.
export const NOT_STARTED = true;

export function createBoard(rows = 6, columns = 7): Board {
  // Your implementation here. Requirements are in README.md.
  void rows;
  void columns;
  throw new Error('createBoard: not implemented');
}

export function dropDisc(board: Board, column: number, player: Player): Board | null {
  void board;
  void column;
  void player;
  throw new Error('dropDisc: not implemented');
}

export function getWinner(board: Board): Player | null {
  void board;
  throw new Error('getWinner: not implemented');
}

export function isDraw(board: Board): boolean {
  void board;
  throw new Error('isDraw: not implemented');
}

export default function ConnectFour({ rows = 6, columns = 7 }: ConnectFourProps) {
  // Your implementation here. Requirements are in README.md.
  return (
    <div className={styles.root}>
      Connect Four {rows}×{columns}: start coding in Solution.tsx
    </div>
  );
}
