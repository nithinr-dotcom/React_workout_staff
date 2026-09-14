// ⚠ Unverified: written before the reference solution. If a test looks wrong, trust the README.
import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { pickTarget } from '../../../test/target';
import * as Reference from './Reference';
import * as Solution from './Solution';

const { impl, describeTask } = pickTarget(Solution, Reference);
const SelectableCells = impl.default;

/** 1-based helpers, matching the accessible names. */
const cell = (r: number, c: number) => screen.getByRole('gridcell', { name: `Row ${r}, Column ${c}` });

function press(el: Element) {
  fireEvent.pointerDown(el, { button: 0, buttons: 1, pointerId: 1, isPrimary: true });
  fireEvent.mouseDown(el, { button: 0, buttons: 1 });
}
function enter(el: Element) {
  fireEvent.pointerEnter(el, { buttons: 1, pointerId: 1, isPrimary: true });
  fireEvent.mouseEnter(el, { buttons: 1 });
}
function release(el: Element) {
  fireEvent.pointerUp(el, { button: 0, buttons: 0, pointerId: 1, isPrimary: true });
  fireEvent.mouseUp(el, { button: 0, buttons: 0 });
}
function drag(from: [number, number], ...path: [number, number][]) {
  press(cell(...from));
  for (const p of path) enter(cell(...p));
  release(cell(...(path.at(-1) ?? from)));
}

const selectedCount = () =>
  screen.getAllByRole('gridcell').filter((el) => el.getAttribute('aria-selected') === 'true').length;

describeTask('SelectableCells', () => {
  it('renders a labelled grid of rows × cols unselected cells', () => {
    render(<SelectableCells rows={3} cols={4} label="Seats" />);
    const grid = screen.getByRole('grid', { name: 'Seats' });
    expect(grid).toHaveAttribute('aria-multiselectable', 'true');
    expect(screen.getAllByRole('row')).toHaveLength(3);
    const cells = screen.getAllByRole('gridcell');
    expect(cells).toHaveLength(12);
    for (const c of cells) expect(c).toHaveAttribute('aria-selected', 'false');
    expect(cell(3, 4)).toBeInTheDocument();
  });

  it('selects a single cell on click', () => {
    const onSelectionChange = vi.fn();
    render(<SelectableCells rows={3} cols={4} onSelectionChange={onSelectionChange} />);
    drag([2, 3]);
    expect(cell(2, 3)).toHaveAttribute('aria-selected', 'true');
    expect(selectedCount()).toBe(1);
    expect(onSelectionChange).toHaveBeenCalledTimes(1);
    expect(onSelectionChange).toHaveBeenCalledWith([{ row: 1, col: 2 }]);
  });

  it('selects the rectangle between the start and end cells', () => {
    render(<SelectableCells rows={4} cols={5} />);
    drag([1, 1], [1, 2], [2, 2], [2, 3]);
    expect(cell(1, 1)).toHaveAttribute('aria-selected', 'true');
    expect(cell(2, 3)).toHaveAttribute('aria-selected', 'true');
    expect(cell(1, 3)).toHaveAttribute('aria-selected', 'true');
    expect(cell(2, 1)).toHaveAttribute('aria-selected', 'true');
    expect(cell(3, 1)).toHaveAttribute('aria-selected', 'false');
    expect(cell(1, 4)).toHaveAttribute('aria-selected', 'false');
    expect(selectedCount()).toBe(6);
  });

  it('previews the selection while dragging, before release', () => {
    const onSelectionChange = vi.fn();
    render(<SelectableCells rows={4} cols={5} onSelectionChange={onSelectionChange} />);
    press(cell(1, 1));
    enter(cell(2, 2));
    expect(cell(1, 1)).toHaveAttribute('aria-selected', 'true');
    expect(cell(2, 2)).toHaveAttribute('aria-selected', 'true');
    expect(cell(1, 2)).toHaveAttribute('aria-selected', 'true');
    expect(onSelectionChange).not.toHaveBeenCalled();
    release(cell(2, 2));
    expect(onSelectionChange).toHaveBeenCalledTimes(1);
  });

  it('shrinks the rectangle when dragging back towards the anchor', () => {
    render(<SelectableCells rows={4} cols={5} />);
    press(cell(1, 1));
    enter(cell(3, 3));
    expect(cell(3, 3)).toHaveAttribute('aria-selected', 'true');
    enter(cell(2, 2));
    expect(cell(3, 3)).toHaveAttribute('aria-selected', 'false');
    expect(cell(1, 3)).toHaveAttribute('aria-selected', 'false');
    expect(cell(2, 2)).toHaveAttribute('aria-selected', 'true');
    release(cell(2, 2));
    expect(selectedCount()).toBe(4);
  });

  it('normalises a drag up and to the left, reporting row-major zero-based coords', () => {
    const onSelectionChange = vi.fn();
    render(<SelectableCells rows={4} cols={5} onSelectionChange={onSelectionChange} />);
    drag([3, 4], [2, 3], [2, 2]);
    expect(onSelectionChange).toHaveBeenCalledWith([
      { row: 1, col: 1 },
      { row: 1, col: 2 },
      { row: 1, col: 3 },
      { row: 2, col: 1 },
      { row: 2, col: 2 },
      { row: 2, col: 3 },
    ]);
    expect(selectedCount()).toBe(6);
  });

  it('replaces the previous selection when a new drag starts', () => {
    render(<SelectableCells rows={4} cols={5} />);
    drag([1, 1], [2, 2]);
    press(cell(4, 5));
    // previous rectangle is gone as soon as the new drag starts
    expect(cell(1, 1)).toHaveAttribute('aria-selected', 'false');
    expect(cell(4, 5)).toHaveAttribute('aria-selected', 'true');
    release(cell(4, 5));
    expect(selectedCount()).toBe(1);
  });

  it('does not select anything when hovering without pressing', () => {
    const onSelectionChange = vi.fn();
    render(<SelectableCells rows={3} cols={3} onSelectionChange={onSelectionChange} />);
    fireEvent.pointerEnter(cell(1, 1));
    fireEvent.mouseEnter(cell(1, 1));
    fireEvent.pointerEnter(cell(2, 2));
    fireEvent.mouseEnter(cell(2, 2));
    for (const c of screen.getAllByRole('gridcell')) expect(c).toHaveAttribute('aria-selected', 'false');
    expect(onSelectionChange).not.toHaveBeenCalled();
  });

  it('commits when released outside the grid and stops tracking afterwards', () => {
    const onSelectionChange = vi.fn();
    render(<SelectableCells rows={4} cols={4} onSelectionChange={onSelectionChange} />);
    press(cell(1, 1));
    enter(cell(2, 2));
    release(document.body);
    expect(onSelectionChange).toHaveBeenCalledTimes(1);
    expect(onSelectionChange.mock.calls[0][0]).toHaveLength(4);

    fireEvent.pointerEnter(cell(4, 4));
    fireEvent.mouseEnter(cell(4, 4));
    expect(cell(4, 4)).toHaveAttribute('aria-selected', 'false');
    expect(cell(2, 2)).toHaveAttribute('aria-selected', 'true');
    expect(onSelectionChange).toHaveBeenCalledTimes(1);
  });

  it('ignores a secondary-button press', () => {
    const onSelectionChange = vi.fn();
    render(<SelectableCells rows={2} cols={2} onSelectionChange={onSelectionChange} />);
    fireEvent.pointerDown(cell(1, 1), { button: 2, buttons: 2, pointerId: 1 });
    fireEvent.mouseDown(cell(1, 1), { button: 2, buttons: 2 });
    fireEvent.pointerUp(cell(1, 1), { button: 2, buttons: 0, pointerId: 1 });
    fireEvent.mouseUp(cell(1, 1), { button: 2, buttons: 0 });
    expect(cell(1, 1)).toHaveAttribute('aria-selected', 'false');
    expect(onSelectionChange).not.toHaveBeenCalled();
  });
});
