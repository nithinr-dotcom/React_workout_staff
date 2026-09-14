import { useId, useMemo, useState } from 'react';
import type { Column, DataTableProps, RowId } from './types';
import styles from './Reference.module.css';

type SortDir = 'ascending' | 'descending';
interface SortState {
  key: string;
  dir: SortDir;
}

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

const isBlank = (v: unknown) => v === null || v === undefined || v === '';

/** Ascending comparison of two raw cell values. Blank values are handled by the caller. */
function compareValues(a: unknown, b: unknown): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return collator.compare(String(a), String(b));
}

function cellText(value: unknown): string {
  return value === null || value === undefined ? '' : String(value);
}

export default function DataTable<Row extends { id: RowId }>({
  columns,
  rows,
  caption,
  filter,
  pageSizeOptions = [10, 25, 50],
  initialPageSize,
}: DataTableProps<Row>) {
  const baseId = useId();
  const [query, setQuery] = useState('');
  const [filterValue, setFilterValue] = useState('');
  const [sort, setSort] = useState<SortState | null>(null);
  const [pageSize, setPageSize] = useState(initialPageSize ?? pageSizeOptions[0] ?? 10);
  const [page, setPage] = useState(1);

  // Every change to the "shape" of the result goes back to page 1. Done in the handlers, not an effect,
  // so there is never a render showing a stale page.
  const updateQuery = (value: string) => {
    setQuery(value);
    setPage(1);
  };
  const updateFilter = (value: string) => {
    setFilterValue(value);
    setPage(1);
  };
  const updatePageSize = (value: number) => {
    setPageSize(value);
    setPage(1);
  };
  const cycleSort = (key: string) => {
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, dir: 'ascending' };
      if (prev.dir === 'ascending') return { key, dir: 'descending' };
      return null;
    });
    setPage(1);
  };

  const filterKey = filter?.key;
  const filterOptions = useMemo(() => {
    if (!filterKey) return [];
    const distinct = new Set<string>();
    for (const row of rows) {
      const v = row[filterKey];
      if (!isBlank(v)) distinct.add(String(v));
    }
    return [...distinct].sort(collator.compare);
  }, [rows, filterKey]);

  // Pipeline: filter → sort → paginate. Each stage only recomputes when its own inputs change.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q && !filterValue) return rows;
    return rows.filter((row) => {
      if (filterKey && filterValue && cellText(row[filterKey]) !== filterValue) return false;
      if (!q) return true;
      return columns.some((col) => cellText(row[col.key]).toLowerCase().includes(q));
    });
  }, [rows, columns, query, filterKey, filterValue]);

  const sorted = useMemo(() => {
    if (!sort) return filtered;
    const key = sort.key as keyof Row;
    const sign = sort.dir === 'ascending' ? 1 : -1;
    // Array.prototype.sort is stable, and we copy so the prop is never mutated.
    return [...filtered].sort((a, b) => {
      const av = a[key];
      const bv = b[key];
      const aBlank = isBlank(av);
      const bBlank = isBlank(bv);
      if (aBlank || bBlank) return aBlank === bBlank ? 0 : aBlank ? 1 : -1; // blanks last either way
      return sign * compareValues(av, bv);
    });
  }, [filtered, sort]);

  const total = sorted.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, pageCount); // rows may have shrunk under us
  const start = (currentPage - 1) * pageSize;
  const visible = useMemo(() => sorted.slice(start, start + pageSize), [sorted, start, pageSize]);

  const summary = total === 0 ? 'Showing 0 of 0' : `Showing ${start + 1}–${start + visible.length} of ${total}`;

  const renderCell = (col: Column<Row>, row: Row) => (col.render ? col.render(row) : cellText(row[col.key]));

  return (
    <div className={styles.wrapper}>
      <div className={styles.toolbar}>
        <label className={styles.field} htmlFor={`${baseId}-search`}>
          <span>Search</span>
          <input
            id={`${baseId}-search`}
            type="search"
            className={styles.input}
            value={query}
            onChange={(e) => updateQuery(e.target.value)}
          />
        </label>
        {filter && (
          <label className={styles.field} htmlFor={`${baseId}-filter`}>
            <span>{filter.label}</span>
            <select
              id={`${baseId}-filter`}
              className={styles.input}
              value={filterValue}
              onChange={(e) => updateFilter(e.target.value)}
            >
              <option value="">All</option>
              {filterOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <div className={styles.scroller}>
        <table className={styles.table}>
          <caption className={styles.caption}>{caption}</caption>
          <thead>
            <tr>
              {columns.map((col) => {
                const dir = sort?.key === col.key ? sort.dir : undefined;
                return (
                  <th key={col.key} scope="col" aria-sort={dir} className={styles.th}>
                    {col.sortable ? (
                      <button type="button" className={styles.sortButton} onClick={() => cycleSort(col.key)}>
                        {col.header}
                        <span className={styles.sortIcon} aria-hidden="true">
                          {dir === 'ascending' ? '▲' : dir === 'descending' ? '▼' : '↕'}
                        </span>
                      </button>
                    ) : (
                      col.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className={styles.empty}>
                  No results
                </td>
              </tr>
            ) : (
              visible.map((row) => (
                <tr key={row.id}>
                  {columns.map((col) => (
                    <td key={col.key} className={typeof row[col.key] === 'number' ? styles.numeric : undefined}>
                      {renderCell(col, row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className={styles.footer}>
        <p className={styles.summary} aria-live="polite">
          {summary}
        </p>
        <label className={styles.field} htmlFor={`${baseId}-size`}>
          <span>Rows per page</span>
          <select
            id={`${baseId}-size`}
            className={styles.input}
            value={pageSize}
            onChange={(e) => updatePageSize(Number(e.target.value))}
          >
            {pageSizeOptions.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <div className={styles.pager}>
          <button
            type="button"
            className={styles.pageButton}
            onClick={() => setPage(currentPage - 1)}
            disabled={currentPage <= 1}
          >
            Previous page
          </button>
          <span>
            Page {currentPage} of {pageCount}
          </span>
          <button
            type="button"
            className={styles.pageButton}
            onClick={() => setPage(currentPage + 1)}
            disabled={currentPage >= pageCount}
          >
            Next page
          </button>
        </div>
      </div>
    </div>
  );
}
