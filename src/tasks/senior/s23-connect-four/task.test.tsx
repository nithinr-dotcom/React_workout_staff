// ⚠ Unverified: written before the reference solution. If a test looks wrong, trust the README.
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it } from 'vitest';
import { pickTarget } from '../../../test/target';
import * as Reference from './Reference';
import * as Solution from './Solution';
import type { Board, Cell } from './types';

const { impl, describeTask } = pickTarget(Solution, Reference);
const ConnectFour = impl.default;

/** Builds a board from rows of `R`, `Y` and `.` (top row first). */
const parse = (rows: string[]): Board =>
  rows.map((line) => [...line].map((ch): Cell => (ch === 'R' ? 'red' : ch === 'Y' ? 'yellow' : null)));

const EMPTY = ['.......', '.......', '.......', '.......', '.......', '.......'];

describeTask('Connect Four: pure logic', () => {
  it('createBoard returns a rows × columns grid of nulls with independent rows', () => {
    const board = impl.createBoard();
    expect(board).toEqual(parse(EMPTY));
    board[0][0] = 'red';
    expect(board[1][0]).toBeNull();
    expect(impl.createBoard(4, 5)).toEqual(parse(['.....', '.....', '.....', '.....']));
  });

  it('dropDisc lands in the lowest empty row, stacks, and does not mutate the input', () => {
    const empty = impl.createBoard();
    const one = impl.dropDisc(empty, 3, 'red')!;
    expect(one).toEqual(parse(['.......', '.......', '.......', '.......', '.......', '...R...']));
    expect(empty).toEqual(parse(EMPTY));
    const two = impl.dropDisc(one, 3, 'yellow')!;
    expect(two[4][3]).toBe('yellow');
    expect(two[5][3]).toBe('red');
    expect(one[4][3]).toBeNull();
  });

  it('dropDisc returns null for a full or out-of-range column', () => {
    const full = parse(['R......', 'Y......', 'R......', 'Y......', 'R......', 'Y......']);
    expect(impl.dropDisc(full, 0, 'red')).toBeNull();
    expect(impl.dropDisc(full, -1, 'red')).toBeNull();
    expect(impl.dropDisc(full, 7, 'red')).toBeNull();
    expect(impl.dropDisc(full, 1, 'red')).not.toBeNull();
  });

  it('getWinner detects horizontal and vertical lines', () => {
    expect(impl.getWinner(parse(['.......', '.......', '.......', '.......', 'YYY....', '...RRRR']))).toBe('red');
    expect(impl.getWinner(parse(['.......', '.......', '......Y', '......Y', 'R.....Y', 'RR....Y']))).toBe('yellow');
  });

  it('getWinner detects both diagonal directions, including at the edges', () => {
    // ↘ from the top-left corner
    expect(impl.getWinner(parse(['R......', '.R.....', '..R....', '...R...', '.......', '.......']))).toBe('red');
    // ↗ ending in the top-right corner
    expect(impl.getWinner(parse(['......Y', '.....Y.', '....Y..', '...Y...', '.......', '.......']))).toBe('yellow');
  });

  it('getWinner returns null for three in a row, broken lines and lines that would wrap', () => {
    expect(impl.getWinner(parse(EMPTY))).toBeNull();
    expect(impl.getWinner(parse(['.......', '.......', '.......', '.......', '.......', 'RRR.RRR']))).toBeNull();
    // three at the end of one row + one at the start of the next row
    expect(impl.getWinner(parse(['.......', '.......', '.......', '.......', '....RRR', 'R......']))).toBeNull();
  });

  it('isDraw is true only for a full board without a winner', () => {
    const drawn = parse(['RYRYRYR', 'RYRYRYR', 'YRYRYRY', 'YRYRYRY', 'RYRYRYR', 'RYRYRYR']);
    expect(impl.getWinner(drawn)).toBeNull();
    expect(impl.isDraw(drawn)).toBe(true);

    const almost = parse(['.YRYRYR', 'RYRYRYR', 'YRYRYRY', 'YRYRYRY', 'RYRYRYR', 'RYRYRYR']);
    expect(impl.isDraw(almost)).toBe(false);

    const fullWithWinner = parse(['RRRRYYR', 'RYRYRYR', 'YRYRYRY', 'YRYRYRY', 'RYRYRYR', 'RYRYRYR']);
    expect(impl.isDraw(fullWithWinner)).toBe(false);
  });
});

describeTask('Connect Four: UI', () => {
  const drop = (user: ReturnType<typeof userEvent.setup>, column: number) =>
    user.click(screen.getByRole('button', { name: `Drop in column ${column}` }));

  it('renders an empty 6 × 7 board with Red to move', () => {
    render(<ConnectFour />);
    expect(screen.getAllByLabelText(/^Row \d+, Column \d+, empty$/)).toHaveLength(42);
    expect(screen.getAllByRole('button', { name: /^Drop in column \d+$/ })).toHaveLength(7);
    expect(screen.getByRole('status')).toHaveTextContent('Red to move');
  });

  it('drops discs to the bottom and alternates players', async () => {
    const user = userEvent.setup();
    render(<ConnectFour />);
    await drop(user, 4);
    expect(screen.getByLabelText('Row 6, Column 4, red')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Yellow to move');
    await drop(user, 4);
    expect(screen.getByLabelText('Row 5, Column 4, yellow')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Red to move');
  });

  it('disables a full column', async () => {
    const user = userEvent.setup();
    render(<ConnectFour />);
    for (let i = 0; i < 6; i++) await drop(user, 1);
    expect(screen.getByRole('button', { name: 'Drop in column 1' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Drop in column 2' })).toBeEnabled();
    expect(screen.getByLabelText('Row 1, Column 1, yellow')).toBeInTheDocument();
  });

  it('announces a win, locks the board, and Reset starts over', async () => {
    const user = userEvent.setup();
    render(<ConnectFour />);
    for (const column of [1, 2, 1, 2, 1, 2, 1]) await drop(user, column);
    expect(screen.getByRole('status')).toHaveTextContent('Red wins');
    for (const button of screen.getAllByRole('button', { name: /^Drop in column \d+$/ })) {
      expect(button).toBeDisabled();
    }
    await user.click(screen.getByRole('button', { name: 'Reset' }));
    expect(screen.getAllByLabelText(/^Row \d+, Column \d+, empty$/)).toHaveLength(42);
    expect(screen.getByRole('status')).toHaveTextContent('Red to move');
    expect(screen.getByRole('button', { name: 'Drop in column 1' })).toBeEnabled();
  });
});
