export interface UndoableCounterProps {
  /** Starting count. Defaults to 0. */
  initialValue?: number;
}

/** The four operations, written exactly as their button labels. */
export type Operation = '/2' | '-1' | '+1' | 'x2';

export interface HistoryEntry {
  operation: Operation;
  oldValue: number;
  newValue: number;
}
