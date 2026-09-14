// ⚠ Unverified: written before the reference solution. If a test looks wrong, trust the README.
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it } from 'vitest';
import { pickTarget } from '../../../test/target';
import * as Reference from './Reference';
import * as Solution from './Solution';

const { impl, describeTask } = pickTarget(Solution, Reference);
const Spreadsheet = impl.default;

describeTask('Spreadsheet engine', () => {
  it('parses literals and evaluates arithmetic with precedence, parentheses and unary minus', () => {
    const values = impl.evaluateSheet({
      A1: '2',
      A2: '3',
      A3: '=A1+A2*2',
      A4: '=(a1 + a2) * -2',
      A5: 'hello',
      A6: '',
      A7: '=Z50+1',
      A8: '=10/4-1',
    });
    expect(values.A1).toBe(2);
    expect(values.A3).toBe(8);
    expect(values.A4).toBe(-10);
    expect(values.A5).toBe('hello');
    expect(values.A6).toBeNull();
    expect(values.A7).toBe(1);
    expect(values.A8).toBe(1.5);
  });

  it('supports SUM over ranges and arguments, skipping empty and text cells', () => {
    const values = impl.evaluateSheet({
      A1: '1',
      A2: '2',
      A3: 'text',
      B1: '4',
      B2: '8',
      C1: '=SUM(A1:A4)',
      C2: '=SUM(A1:B2, 10)',
      C3: '=SUM(B2:A1)',
    });
    expect(values.C1).toBe(3);
    expect(values.C2).toBe(25);
    expect(values.C3).toBe(15);
  });

  it('reports #REF!, #VALUE!, #DIV/0!, #NAME? and #ERROR!, and propagates errors', () => {
    const values = impl.evaluateSheet({
      A1: 'hello',
      B1: '=A51',
      B2: '=AA1+1',
      B3: '=A1+1',
      B4: '=1/0',
      B5: '=FOO(1)',
      B6: '=1+',
      C1: '=B4*2',
    });
    expect(values.B1).toEqual({ error: '#REF!' });
    expect(values.B2).toEqual({ error: '#REF!' });
    expect(values.B3).toEqual({ error: '#VALUE!' });
    expect(values.B4).toEqual({ error: '#DIV/0!' });
    expect(values.B5).toEqual({ error: '#NAME?' });
    expect(values.B6).toEqual({ error: '#ERROR!' });
    expect(values.C1).toEqual({ error: '#DIV/0!' });
  });

  it('marks cycles (including self-references) and recovers when the cycle is broken', () => {
    const sheet = impl.createSheetEngine();
    sheet.setCell('A1', '=B1+1');
    sheet.setCell('B1', '=A1');
    sheet.setCell('C1', '=A1*2');
    sheet.setCell('D1', '=D1');
    expect(sheet.getValue('A1')).toEqual({ error: '#CYCLE!' });
    expect(sheet.getValue('B1')).toEqual({ error: '#CYCLE!' });
    expect(sheet.getValue('C1')).toEqual({ error: '#CYCLE!' });
    expect(sheet.getValue('D1')).toEqual({ error: '#CYCLE!' });

    sheet.setCell('B1', '5');
    expect(sheet.getValue('A1')).toBe(6);
    expect(sheet.getValue('C1')).toBe(12);
    expect(sheet.getRaw('B1')).toBe('5');
  });

  it('recomputes only transitive dependents, in topological order', () => {
    const sheet = impl.createSheetEngine();
    sheet.setCell('A1', '1');
    sheet.setCell('B1', '=A1*2');
    sheet.setCell('C1', '=B1+A1');
    sheet.setCell('D1', '5');
    sheet.setCell('E1', '=D1');
    sheet.setCell('F1', '=C1+E1');

    const changed = sheet.setCell('A1', '3');
    expect([...changed].sort()).toEqual(['A1', 'B1', 'C1', 'F1']);
    expect(changed[0]).toBe('A1');
    expect(changed.indexOf('B1')).toBeLessThan(changed.indexOf('C1'));
    expect(changed.indexOf('C1')).toBeLessThan(changed.indexOf('F1'));
    expect(sheet.getValue('F1')).toBe(14);

    // Re-pointing a formula drops the old dependency edge.
    sheet.setCell('B1', '=D1');
    expect([...sheet.setCell('A1', '4')].sort()).toEqual(['A1', 'C1', 'F1']);
    expect(sheet.getValue('C1')).toBe(9);
  });
});

/** Cell locator per the README test contract: row 1 is the header row. */
function cell(id: string) {
  const col = id.charCodeAt(0) - 65;
  const row = Number(id.slice(1));
  const grid = screen.getByRole('grid', { name: 'Spreadsheet' });
  return within(within(grid).getAllByRole('row')[row]).getAllByRole('gridcell')[col];
}

describeTask('Spreadsheet UI', () => {
  it('renders column and row headers and computed values', () => {
    render(<Spreadsheet initialCells={{ A1: '2', B1: '=A1*10', C1: '=1/0' }} />);
    expect(screen.getByRole('columnheader', { name: 'A' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Z' })).toBeInTheDocument();
    expect(screen.getByRole('rowheader', { name: '50' })).toBeInTheDocument();
    expect(cell('A1')).toHaveTextContent('2');
    expect(cell('B1')).toHaveTextContent('20');
    expect(cell('C1')).toHaveTextContent('#DIV/0!');
  });

  it('edits with Enter, shows the raw formula, commits, updates dependents and moves down', async () => {
    const user = userEvent.setup();
    render(<Spreadsheet initialCells={{ A1: '2', B1: '=A1*10' }} />);
    await user.click(cell('B1'));
    expect(cell('B1')).toHaveAttribute('aria-selected', 'true');
    await user.keyboard('{Enter}');
    expect(screen.getByRole('textbox', { name: 'B1' })).toHaveValue('=A1*10');
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('textbox')).toBeNull();

    await user.click(cell('A1'));
    await user.keyboard('{Enter}');
    const editor = screen.getByRole('textbox', { name: 'A1' });
    await user.clear(editor);
    await user.keyboard('=5+3{Enter}');
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(cell('A1')).toHaveTextContent('8');
    expect(cell('B1')).toHaveTextContent('80');
    expect(cell('A2')).toHaveAttribute('aria-selected', 'true');
  });

  it('cancels an edit with Escape, leaving the cell unchanged', async () => {
    const user = userEvent.setup();
    render(<Spreadsheet initialCells={{ A1: '2' }} />);
    await user.click(cell('A1'));
    await user.keyboard('{F2}');
    const editor = screen.getByRole('textbox', { name: 'A1' });
    await user.clear(editor);
    await user.keyboard('999{Escape}');
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(cell('A1')).toHaveTextContent('2');
    expect(cell('A1')).not.toHaveTextContent('999');
  });

  it('moves the selection with arrow keys, clamped at the edges', async () => {
    const user = userEvent.setup();
    render(<Spreadsheet />);
    await user.click(cell('A1'));
    await user.keyboard('{ArrowUp}{ArrowLeft}');
    expect(cell('A1')).toHaveAttribute('aria-selected', 'true');
    await user.keyboard('{ArrowRight}{ArrowDown}{ArrowDown}');
    expect(cell('B3')).toHaveAttribute('aria-selected', 'true');
    expect(cell('A1')).not.toHaveAttribute('aria-selected', 'true');
  });
});
