/*
 * Minimal public contract. Tests and the Playground depend on everything here.
 * Extend it (column resizing, selection, custom cell renderers…) but don't break it.
 */

export type CellValue = string | number;

export type Row = Record<string, CellValue>;

export interface Column {
  /** Property of the row object to display. */
  key: string;
  /** Header text. Also the accessible name of the header's sort button. */
  title: string;
  /** Fixed width in px. */
  width: number;
  /** Optional display formatting. Sorting always uses the raw value. */
  format?: (value: CellValue) => string;
}

export type SortDirection = 'ascending' | 'descending';

export interface DataGridProps {
  rows: Row[];
  columns: Column[];
  /** Accessible name of the grid. */
  'aria-label': string;
  /** Viewport height in px (the grid element is the scroll container). */
  height: number;
  /** Viewport width in px. */
  width: number;
  /** Fixed row height in px. Default 32. Also used for the header row. */
  rowHeight?: number;
  /** Extra rows/columns rendered outside the viewport on each side. Default 3. */
  overscan?: number;
}
