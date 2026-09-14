// ⚠ Unverified: written before the reference solution. If a test looks wrong, trust the README.
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it } from 'vitest';
import { pickTarget } from '../../../test/target';
import * as Reference from './Reference';
import * as Solution from './Solution';
import type { Column, Row } from './types';

const { impl, describeTask } = pickTarget(Solution, Reference);
const DataGrid = impl.default;

const ROW_COUNT = 10_000;
const numeric = (i: number) => ((i + 1) * 7919) % 10007;

function makeData(colCount: number): { rows: Row[]; columns: Column[] } {
  const columns: Column[] = Array.from({ length: colCount }, (_, j) => ({ key: `c${j}`, title: `Col ${j}`, width: 100 }));
  const rows: Row[] = Array.from({ length: ROW_COUNT }, (_, i) => {
    const row: Row = {};
    for (let j = 0; j < colCount; j++) row[`c${j}`] = j === 1 ? numeric(i) : `r${i}c${j}`;
    return row;
  });
  return { rows, columns };
}

const DATA_20 = makeData(20);
const DATA_50 = makeData(50);

function renderGrid(data = DATA_20) {
  const utils = render(
    <DataGrid rows={data.rows} columns={data.columns} aria-label="Accounts" width={800} height={400} rowHeight={32} />,
  );
  return { ...utils, grid: screen.getByRole('grid', { name: 'Accounts' }) };
}

const rowAt = (grid: HTMLElement, ariaRowIndex: number) =>
  grid.querySelector<HTMLElement>(`[role="row"][aria-rowindex="${ariaRowIndex}"]`);
const cellAt = (grid: HTMLElement, ariaRowIndex: number, ariaColIndex: number) =>
  rowAt(grid, ariaRowIndex)?.querySelector<HTMLElement>(`[aria-colindex="${ariaColIndex}"]`) ?? null;

describeTask('DataGrid', () => {
  it('exposes total row/column counts on the grid', () => {
    const { grid } = renderGrid();
    expect(grid).toHaveAttribute('aria-rowcount', String(ROW_COUNT + 1));
    expect(grid).toHaveAttribute('aria-colcount', '20');
    expect(within(grid).getByRole('columnheader', { name: 'Col 0' })).toBeInTheDocument();
    expect(screen.getByText('r0c0')).toBeInTheDocument();
  });

  it('keeps the DOM bounded with row and column virtualization', () => {
    const { grid } = renderGrid(DATA_50);
    const rows = grid.querySelectorAll('[role="row"]');
    expect(rows.length).toBeGreaterThan(5);
    expect(rows.length).toBeLessThan(40);
    for (const row of rows) {
      expect(row.querySelectorAll('[role="gridcell"]').length).toBeLessThan(30);
    }
    expect(screen.queryByText('r100c0')).toBeNull();
    expect(screen.queryByText('r0c45')).toBeNull();
  });

  it('renders the rows at the scroll position with correct aria-rowindex, keeping the header', () => {
    const { grid } = renderGrid();
    fireEvent.scroll(grid, { target: { scrollTop: 5000 * 32 } });
    expect(screen.getByText('r5000c0')).toBeInTheDocument();
    expect(screen.getByText('r5005c0')).toBeInTheDocument();
    expect(screen.queryByText('r0c0')).toBeNull();
    expect(cellAt(grid, 5002, 1)).toHaveTextContent('r5000c0');
    expect(within(grid).getByRole('columnheader', { name: 'Col 0' })).toBeInTheDocument();
    expect(grid.querySelectorAll('[role="row"]').length).toBeLessThan(40);
  });

  it('virtualizes columns on horizontal scroll while the first column stays rendered', () => {
    const { grid } = renderGrid(DATA_50);
    fireEvent.scroll(grid, { target: { scrollTop: 0, scrollLeft: 3000 } });
    expect(screen.getByText('r0c33')).toBeInTheDocument();
    expect(screen.getByText('r0c0')).toBeInTheDocument();
    expect(screen.queryByText('r0c10')).toBeNull();
    expect(within(grid).getByRole('columnheader', { name: 'Col 33' })).toBeInTheDocument();
    for (const row of grid.querySelectorAll('[role="row"]')) {
      expect(row.querySelectorAll('[role="gridcell"]').length).toBeLessThan(30);
    }
  });

  it('sorts by a column: ascending, descending, then back to the original order', async () => {
    const user = userEvent.setup();
    const { grid } = renderGrid();
    const values = DATA_20.rows.map((r) => r.c1 as number);
    const header = () => within(grid).getByRole('columnheader', { name: 'Col 1' });

    await user.click(within(grid).getByRole('button', { name: 'Col 1' }));
    await waitFor(() => expect(header()).toHaveAttribute('aria-sort', 'ascending'));
    await waitFor(() => expect(cellAt(grid, 2, 2)).toHaveTextContent(new RegExp(`^${Math.min(...values)}$`)));

    await user.click(within(grid).getByRole('button', { name: 'Col 1' }));
    await waitFor(() => expect(header()).toHaveAttribute('aria-sort', 'descending'));
    await waitFor(() => expect(cellAt(grid, 2, 2)).toHaveTextContent(new RegExp(`^${Math.max(...values)}$`)));

    await user.click(within(grid).getByRole('button', { name: 'Col 1' }));
    await waitFor(() => expect(cellAt(grid, 2, 2)).toHaveTextContent(new RegExp(`^${values[0]}$`)));
    expect(header().getAttribute('aria-sort') ?? 'none').toBe('none');
  });

  it('moves focus between cells with arrow keys and Home', async () => {
    const user = userEvent.setup();
    renderGrid();
    await user.click(screen.getByText('r0c0'));
    expect(document.activeElement).toHaveAttribute('role', 'gridcell');
    expect(document.activeElement).toHaveTextContent('r0c0');

    await user.keyboard('{ArrowDown}');
    expect(document.activeElement).toHaveTextContent('r1c0');
    await user.keyboard('{ArrowRight}{ArrowRight}');
    expect(document.activeElement).toHaveTextContent('r1c2');
    await user.keyboard('{ArrowLeft}');
    // Column c1 holds numbers.
    expect(document.activeElement).toHaveTextContent(String(numeric(1)));
    await user.keyboard('{Home}');
    expect(document.activeElement).toHaveTextContent('r1c0');
    expect(document.activeElement).toHaveAttribute('role', 'gridcell');
  });

  it('keeps a single tab stop inside the grid', async () => {
    const user = userEvent.setup();
    const { grid } = renderGrid();
    await user.click(screen.getByText('r2c3'));
    const tabbable = grid.querySelectorAll('[tabindex="0"], button:not([tabindex="-1"]), a[href]:not([tabindex="-1"])');
    expect(tabbable).toHaveLength(1);
    expect(tabbable[0]).toHaveTextContent('r2c3');
  });

  it('renders "No rows" for an empty data set', () => {
    render(<DataGrid rows={[]} columns={DATA_20.columns} aria-label="Accounts" width={800} height={400} />);
    expect(screen.getByText('No rows')).toBeInTheDocument();
  });
});
