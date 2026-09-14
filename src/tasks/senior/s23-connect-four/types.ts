import type { ComponentType } from 'react';

export type Player = 'red' | 'yellow';

/** A slot is empty (`null`) or holds the disc of the player who dropped it. */
export type Cell = Player | null;

/** `board[row][column]`. Row 0 is the TOP row, column 0 is the LEFT column. */
export type Board = Cell[][];

export interface ConnectFourProps {
  /** Default 6. */
  rows?: number;
  /** Default 7. */
  columns?: number;
}

export interface ConnectFourModule {
  default: ComponentType<ConnectFourProps>;
  /** A rows × columns board of `null`s. Defaults 6 × 7. */
  createBoard(rows?: number, columns?: number): Board;
  /** Drops `player`'s disc into 0-based `column`. Returns a NEW board, or `null` if the column is full or out of range. */
  dropDisc(board: Board, column: number, player: Player): Board | null;
  /** The player with 4 in a row (horizontal, vertical or either diagonal), or `null`. */
  getWinner(board: Board): Player | null;
  /** `true` when every slot is filled and nobody has won. */
  isDraw(board: Board): boolean;
}
