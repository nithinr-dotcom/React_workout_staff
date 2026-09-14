// ⚠ Unverified: written before the reference solution. If a test looks wrong, trust the README.
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it } from 'vitest';
import { pickTarget } from '../../../test/target';
import * as Reference from './Reference';
import * as Solution from './Solution';
import type { Board, GameState } from './types';

const { impl, describeTask } = pickTarget(Solution, Reference);
const SnakesAndLadders = impl.default;

const BOARD: Board = { ladders: { 4: 14, 9: 31, 80: 100 }, snakes: { 17: 7, 62: 19 } };

const game = (positions: number[], current = 0, board: Board = BOARD): GameState => ({
  board,
  positions,
  current,
  winner: null,
});

describeTask('applyMove (pure)', () => {
  it('moves the current player forward, passes the turn and does not mutate the input', () => {
    const before = game([0, 0]);
    const snapshot = structuredClone(before);
    const after = impl.applyMove(before, 3);
    expect(after.positions).toEqual([3, 0]);
    expect(after.current).toBe(1);
    expect(after.winner).toBeNull();
    expect(before).toEqual(snapshot);

    const next = impl.applyMove(after, 5);
    expect(next.positions).toEqual([3, 5]);
    expect(next.current).toBe(0);
  });

  it('climbs ladders and slides down snakes, applying only one jump', () => {
    expect(impl.applyMove(game([0, 0]), 4).positions).toEqual([14, 0]);
    expect(impl.applyMove(game([12, 0]), 5).positions).toEqual([7, 0]);
    // A ladder whose top is a snake head does not chain.
    const tricky: Board = { ladders: { 2: 17 }, snakes: { 17: 3 } };
    expect(impl.applyMove(game([0, 0], 0, tricky), 2).positions).toEqual([17, 0]);
  });

  it('keeps a player in place when the roll overshoots 100', () => {
    const after = impl.applyMove(game([97, 50]), 5);
    expect(after.positions).toEqual([97, 50]);
    expect(after.current).toBe(1);
    expect(after.winner).toBeNull();
  });

  it('declares a winner on exactly 100, directly or by ladder, and then ignores further moves', () => {
    const direct = impl.applyMove(game([50, 97], 1), 3);
    expect(direct.positions).toEqual([50, 100]);
    expect(direct.winner).toBe(1);

    const byLadder = impl.applyMove(game([77, 0]), 3);
    expect(byLadder.positions).toEqual([100, 0]);
    expect(byLadder.winner).toBe(0);

    const ignored = impl.applyMove(direct, 4);
    expect(ignored.positions).toEqual([50, 100]);
    expect(ignored.winner).toBe(1);
  });

  it('gives another turn on a 6 (even when stuck) and wraps turns around', () => {
    expect(impl.applyMove(game([10, 20, 30]), 6).current).toBe(0);
    expect(impl.applyMove(game([98, 20]), 6)).toMatchObject({ positions: [98, 20], current: 0 });
    expect(impl.applyMove(game([10, 20, 30], 2), 1).current).toBe(0);
  });
});

/** A `random` that produces these dice rolls in order. */
function dice(...rolls: number[]) {
  let i = 0;
  return () => {
    const roll = rolls[i++];
    if (roll === undefined) throw new Error('test ran out of dice rolls');
    return (roll - 1) / 6 + 0.01;
  };
}

const square = (n: number) => screen.getByRole('cell', { name: new RegExp(`^Square ${n}\\b`) });
const roll = (user: ReturnType<typeof userEvent.setup>) => user.click(screen.getByRole('button', { name: 'Roll dice' }));
const status = () => screen.getByRole('status');

describeTask('SnakesAndLadders (component)', () => {
  it('renders a 10×10 boustrophedon board with jumps in the square names', () => {
    render(<SnakesAndLadders snakes={BOARD.snakes} ladders={BOARD.ladders} random={dice()} />);
    const rows = within(screen.getByRole('table', { name: 'Board' })).getAllByRole('row');
    expect(rows).toHaveLength(10);
    const numbers = rows.map((row) =>
      within(row)
        .getAllByRole('cell')
        .map((cell) => Number(/^Square (\d+)/.exec(cell.getAttribute('aria-label') ?? '')?.[1])),
    );
    expect(numbers[0]).toEqual([100, 99, 98, 97, 96, 95, 94, 93, 92, 91]);
    expect(numbers[1]).toEqual([81, 82, 83, 84, 85, 86, 87, 88, 89, 90]);
    expect(numbers[8]).toEqual([20, 19, 18, 17, 16, 15, 14, 13, 12, 11]);
    expect(numbers[9]).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(square(4)).toHaveAccessibleName('Square 4, ladder to 14');
    expect(square(17)).toHaveAccessibleName('Square 17, snake to 7');
    expect(square(5)).toHaveAccessibleName('Square 5');
    expect(screen.getByText("Player 1's turn")).toBeInTheDocument();
  });

  it('rolls with the injected random, moves the token, announces the move and passes the turn', async () => {
    const user = userEvent.setup();
    render(<SnakesAndLadders snakes={BOARD.snakes} ladders={BOARD.ladders} random={dice(3, 2)} />);
    await roll(user);
    expect(within(square(3)).getByRole('img', { name: 'Player 1' })).toBeInTheDocument();
    expect(status()).toHaveTextContent('Player 1 rolled 3, moved to 3');
    expect(screen.getByText("Player 2's turn")).toBeInTheDocument();

    await roll(user);
    expect(within(square(2)).getByRole('img', { name: 'Player 2' })).toBeInTheDocument();
    expect(status()).toHaveTextContent('Player 2 rolled 2, moved to 2');
    expect(screen.getByText("Player 1's turn")).toBeInTheDocument();
  });

  it('announces ladders and snakes', async () => {
    const user = userEvent.setup();
    render(<SnakesAndLadders snakes={BOARD.snakes} ladders={BOARD.ladders} random={dice(4, 5, 3)} />);
    await roll(user);
    expect(status()).toHaveTextContent('Player 1 rolled 4, climbed a ladder from 4 to 14');
    expect(within(square(14)).getByRole('img', { name: 'Player 1' })).toBeInTheDocument();
    await roll(user); // Player 2 → 5
    await roll(user); // Player 1: 14 + 3 = 17 → snake
    expect(status()).toHaveTextContent('Player 1 rolled 3, slid down a snake from 17 to 7');
    expect(within(square(7)).getByRole('img', { name: 'Player 1' })).toBeInTheDocument();
    expect(within(square(17)).queryByRole('img', { name: 'Player 1' })).not.toBeInTheDocument();
  });

  it('gives the same player another turn after rolling a 6', async () => {
    const user = userEvent.setup();
    render(<SnakesAndLadders snakes={BOARD.snakes} ladders={BOARD.ladders} random={dice(6, 2)} />);
    await roll(user);
    expect(status()).toHaveTextContent('Player 1 rolled 6, moved to 6');
    expect(screen.getByText("Player 1's turn")).toBeInTheDocument();
    await roll(user);
    expect(within(square(8)).getByRole('img', { name: 'Player 1' })).toBeInTheDocument();
    expect(screen.getByText("Player 2's turn")).toBeInTheDocument();
  });

  it('needs an exact roll to finish, ends the game on 100 and New game resets', async () => {
    const user = userEvent.setup();
    const ladders = { 3: 97 };
    render(<SnakesAndLadders snakes={{}} ladders={ladders} random={dice(3, 1, 5, 1, 3)} />);
    await roll(user); // P1 → 97
    await roll(user); // P2 → 1
    await roll(user); // P1 rolls 5 → stays
    expect(status()).toHaveTextContent('Player 1 rolled 5, needs an exact roll, stays on 97');
    expect(within(square(97)).getByRole('img', { name: 'Player 1' })).toBeInTheDocument();
    await roll(user); // P2 → 2
    await roll(user); // P1 rolls 3 → 100
    expect(status()).toHaveTextContent('Player 1 rolled 3, moved to 100');
    expect(screen.getByText('Player 1 wins')).toBeInTheDocument();
    expect(within(square(100)).getByRole('img', { name: 'Player 1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Roll dice' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'New game' }));
    expect(screen.getByRole('button', { name: 'Roll dice' })).toBeEnabled();
    expect(screen.getByText("Player 1's turn")).toBeInTheDocument();
    expect(within(square(100)).queryByRole('img')).not.toBeInTheDocument();
    expect(within(square(2)).queryByRole('img')).not.toBeInTheDocument();
    expect(status()).not.toHaveTextContent(/rolled/);
  });

  it('supports more players and cycles the turn through all of them', async () => {
    const user = userEvent.setup();
    render(<SnakesAndLadders players={3} snakes={{}} ladders={{}} random={dice(1, 2, 3, 4)} />);
    await roll(user);
    await roll(user);
    expect(screen.getByText("Player 3's turn")).toBeInTheDocument();
    await roll(user);
    expect(within(square(3)).getByRole('img', { name: 'Player 3' })).toBeInTheDocument();
    expect(screen.getByText("Player 1's turn")).toBeInTheDocument();
    await roll(user);
    expect(within(square(5)).getByRole('img', { name: 'Player 1' })).toBeInTheDocument();
  });
});
