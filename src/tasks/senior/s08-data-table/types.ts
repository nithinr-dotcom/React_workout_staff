import type { ReactNode } from 'react';

export type RowId = string | number;

export interface Column<Row> {
  /** Property of the row shown in this column. Also used for sorting and searching. */
  key: keyof Row & string;
  /** Header text. Also the accessible name of the column header. */
  header: string;
  /** Default false. */
  sortable?: boolean;
  /** Custom cell content. Sorting and searching still use the raw `row[key]` value. */
  render?: (row: Row) => ReactNode;
}

export interface TableFilter<Row> {
  /** Property whose distinct values populate the select. */
  key: keyof Row & string;
  /** Label of the select, e.g. "Role". */
  label: string;
}

export interface DataTableProps<Row extends { id: RowId }> {
  columns: Column<Row>[];
  rows: Row[];
  /** Visible table caption and the table's accessible name. */
  caption: string;
  /** Optional single-select filter on one property. */
  filter?: TableFilter<Row>;
  /** Default [10, 25, 50]. */
  pageSizeOptions?: number[];
  /** Default: the first entry of pageSizeOptions. */
  initialPageSize?: number;
}

export type DataTableComponent = <Row extends { id: RowId }>(props: DataTableProps<Row>) => ReactNode;
