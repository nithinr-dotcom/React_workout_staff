import type { CellId, CellValue, SheetEngine, SheetSize, SpreadsheetProps } from './types';
import styles from './Solution.module.css';

// ⬇ Delete this line when you start. Tests for this task are skipped while it exists.
export const NOT_STARTED = true;

export function createSheetEngine(options: SheetSize = {}): SheetEngine {
  // Your implementation here. Requirements are in README.md.
  void options;
  throw new Error('createSheetEngine: not implemented');
}

export function evaluateSheet(cells: Record<CellId, string>, options: SheetSize = {}): Record<CellId, CellValue> {
  void cells;
  void options;
  throw new Error('evaluateSheet: not implemented');
}

export default function Spreadsheet({ engine, initialCells, 'aria-label': label = 'Spreadsheet' }: SpreadsheetProps) {
  void engine;
  void initialCells;
  return <div className={styles.root}>{label}: start coding in Solution.tsx</div>;
}
