export type Player = 'X' | 'O';

/** A cell is empty (`null`) or holds the mark of the player who took it. */
export type Cell = Player | null;

export interface TicTacToeProps {
  /** Board is size × size. Default 3. A player wins with `size` marks in a line. */
  size?: number;
}
