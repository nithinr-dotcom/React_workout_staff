/** Zero-based cell coordinates. */
export interface CellCoord {
  row: number;
  col: number;
}

export interface SelectableCellsProps {
  rows: number;
  cols: number;
  /** Accessible name of the grid. Default "Selectable cells". */
  label?: string;
  /**
   * Called once when a selection is committed (mouse/pointer released),
   * with every selected cell in row-major order (row 0 left→right, then row 1, …).
   */
  onSelectionChange?: (cells: CellCoord[]) => void;
}
