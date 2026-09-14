// ⚠ Unverified: written before the reference solution. If a test looks wrong, trust the README.
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it } from 'vitest';
import { pickTarget } from '../../../test/target';
import * as Reference from './Reference';
import * as Solution from './Solution';

const { impl, describeTask } = pickTarget(Solution, Reference);
const TicTacToe = impl.default;

const cell = (row: number, col: number) => screen.getByRole('button', { name: new RegExp(`^Row ${row}, Column ${col}, `) });
const status = () => screen.getByRole('status');

/** Plays a list of [row, col] moves in order (X first). */
async function play(user: ReturnType<typeof userEvent.setup>, moves: [number, number][]) {
  for (const [r, c] of moves) await user.click(cell(r, c));
}

describeTask('TicTacToe', () => {
  it('renders a 3×3 board of empty cells with X to move', () => {
    render(<TicTacToe />);
    expect(screen.getAllByRole('button', { name: /^Row \d+, Column \d+, empty$/ })).toHaveLength(9);
    expect(status()).toHaveTextContent('Next player: X');
  });

  it('renders size × size cells', () => {
    render(<TicTacToe size={4} />);
    expect(screen.getAllByRole('button', { name: /^Row \d+, Column \d+, / })).toHaveLength(16);
    expect(screen.getByRole('button', { name: 'Row 4, Column 4, empty' })).toBeInTheDocument();
  });

  it('places marks and alternates players', async () => {
    const user = userEvent.setup();
    render(<TicTacToe />);
    await user.click(cell(1, 1));
    expect(cell(1, 1)).toHaveAccessibleName('Row 1, Column 1, X');
    expect(status()).toHaveTextContent('Next player: O');
    await user.click(cell(2, 3));
    expect(cell(2, 3)).toHaveAccessibleName('Row 2, Column 3, O');
    expect(status()).toHaveTextContent('Next player: X');
  });

  it('ignores clicks on a filled cell', async () => {
    const user = userEvent.setup();
    render(<TicTacToe />);
    await user.click(cell(2, 2));
    await user.click(cell(2, 2));
    expect(cell(2, 2)).toHaveAccessibleName('Row 2, Column 2, X');
    expect(status()).toHaveTextContent('Next player: O');
  });

  it('detects a row win', async () => {
    const user = userEvent.setup();
    render(<TicTacToe />);
    // X: (1,1) (1,2) (1,3)   O: (2,1) (2,2)
    await play(user, [[1, 1], [2, 1], [1, 2], [2, 2], [1, 3]]);
    expect(status()).toHaveTextContent('Winner: X');
  });

  it('detects a column win for O', async () => {
    const user = userEvent.setup();
    render(<TicTacToe />);
    // X: (1,1) (2,1) (3,3)   O: (1,2) (2,2) (3,2)
    await play(user, [[1, 1], [1, 2], [2, 1], [2, 2], [3, 3], [3, 2]]);
    expect(status()).toHaveTextContent('Winner: O');
  });

  it('detects the main diagonal on a 4×4 board (needs all 4)', async () => {
    const user = userEvent.setup();
    render(<TicTacToe size={4} />);
    // X: (1,1) (2,2) (3,3) (4,4)   O: (1,2) (1,3) (1,4)
    await play(user, [[1, 1], [1, 2], [2, 2], [1, 3], [3, 3]]);
    expect(status()).toHaveTextContent('Next player: O');
    await play(user, [[1, 4], [4, 4]]);
    expect(status()).toHaveTextContent('Winner: X');
  });

  it('detects the anti-diagonal on a 4×4 board', async () => {
    const user = userEvent.setup();
    render(<TicTacToe size={4} />);
    // X: (1,4) (2,3) (3,2) (4,1)   O: (4,2) (4,3) (4,4)
    await play(user, [[1, 4], [4, 2], [2, 3], [4, 3], [3, 2], [4, 4], [4, 1]]);
    expect(status()).toHaveTextContent('Winner: X');
  });

  it('detects a draw', async () => {
    const user = userEvent.setup();
    render(<TicTacToe />);
    // Final board:
    // X O X
    // X O O
    // O X X
    await play(user, [[1, 1], [1, 2], [1, 3], [2, 2], [2, 1], [2, 3], [3, 2], [3, 1], [3, 3]]);
    expect(status()).toHaveTextContent('Draw');
  });

  it('treats a win on the last cell as a win, not a draw', async () => {
    const user = userEvent.setup();
    render(<TicTacToe />);
    // Final board (X plays (3,3) last and completes the main diagonal):
    // X O X
    // O X O
    // O X X
    await play(user, [[1, 1], [1, 2], [1, 3], [2, 1], [2, 2], [2, 3], [3, 2], [3, 1], [3, 3]]);
    expect(status()).toHaveTextContent('Winner: X');
  });

  it('ignores moves after the game is won', async () => {
    const user = userEvent.setup();
    render(<TicTacToe />);
    await play(user, [[1, 1], [2, 1], [1, 2], [2, 2], [1, 3]]);
    await user.click(cell(3, 3)).catch(() => {});
    expect(cell(3, 3)).toHaveAccessibleName('Row 3, Column 3, empty');
    expect(status()).toHaveTextContent('Winner: X');
  });

  it('Reset clears the board and gives the move back to X', async () => {
    const user = userEvent.setup();
    render(<TicTacToe />);
    await play(user, [[1, 1], [2, 1], [1, 2], [2, 2], [1, 3]]);
    await user.click(screen.getByRole('button', { name: 'Reset' }));
    expect(screen.getAllByRole('button', { name: /, empty$/ })).toHaveLength(9);
    expect(status()).toHaveTextContent('Next player: X');
  });
});
