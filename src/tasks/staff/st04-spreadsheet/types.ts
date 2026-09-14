import type { ReactNode } from 'react';

/*
 * Minimal public contract. Tests and the Playground depend on everything here.
 * Extend it (undo, ranges, more functions, subscriptions per cell…) but don't break it.
 */

/** Column letter A–Z followed by a 1-based row number, e.g. "A1", "Z50". Always upper-case when returned. */
export type CellId = string;

export type CellErrorCode = '#CYCLE!' | '#REF!' | '#VALUE!' | '#DIV/0!' | '#NAME?' | '#ERROR!';

export interface CellError {
  error: CellErrorCode;
}

/** `null` = empty cell. Numbers for numeric input and formula results, strings for text. */
export type CellValue = number | string | null | CellError;

export interface SheetSize {
  /** Default 50. */
  rows?: number;
  /** Default 26 (A–Z). */
  cols?: number;
}

export interface SheetEngine {
  readonly rows: number;
  readonly cols: number;
  /**
   * Store raw input for a cell ("" clears it) and recompute what depends on it.
   * Returns every cell id whose value was recomputed, in evaluation order: the edited cell first,
   * and each cell after all the cells it depends on. Cells that don't depend on the edit are NOT included.
   */
  setCell(id: CellId, raw: string): CellId[];
  /** Raw input as typed ("" for empty). */
  getRaw(id: CellId): string;
  /** Current computed value. */
  getValue(id: CellId): CellValue;
  /** Called after every setCell with the recomputed ids. Returns an unsubscribe function. */
  subscribe(listener: (changed: CellId[]) => void): () => void;
}

export interface SpreadsheetProps {
  /** Use an existing engine (e.g. shared with other views). */
  engine?: SheetEngine;
  /** Convenience for creating an engine pre-filled with raw inputs. Ignored when `engine` is passed. */
  initialCells?: Record<CellId, string>;
  /** Accessible name of the grid. Default "Spreadsheet". */
  'aria-label'?: string;
}

export interface SpreadsheetModule {
  default: (props: SpreadsheetProps) => ReactNode;
  createSheetEngine: (options?: SheetSize) => SheetEngine;
  /** Pure helper: evaluate a batch of raw inputs; returns a value for every key in `cells`. */
  evaluateSheet: (cells: Record<CellId, string>, options?: SheetSize) => Record<CellId, CellValue>;
}
