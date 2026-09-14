// ⚠ Unverified: written before the reference solution. If a test looks wrong, trust the README.
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { pickTarget } from '../../../test/target';
import * as Reference from './Reference';
import * as Solution from './Solution';
import type { Board } from './types';

const { impl, describeTask } = pickTarget(Solution, Reference);
const Game2048 = impl.default;

const Z = [0, 0, 0, 0];
/** A board whose first row is `row` and the rest empty. */
const firstRow = (row: number[]): Board => [row, [...Z], [...Z], [...Z]];
const leftRow = (row: number[]) => impl.move(firstRow(row), 'left');

describeTask('2048: move', () => {
  it('slides tiles toward the wall without merging different values', () => {
    const result = leftRow([0, 2, 0, 4]);
    expect(result.board).toEqual(firstRow([2, 4, 0, 0]));
    expect(result.score).toBe(0);
    expect(result.moved).toBe(true);
  });

  it('merges equal pairs, across gaps, and scores the merged values', () => {
    expect(leftRow([2, 2, 2, 2])).toEqual({ board: firstRow([4, 4, 0, 0]), score: 8, moved: true });
    expect(leftRow([2, 0, 2, 4])).toEqual({ board: firstRow([4, 4, 0, 0]), score: 4, moved: true });
  });

  it('lets each tile merge at most once per move', () => {
    expect(leftRow([2, 2, 4, 0]).board).toEqual(firstRow([4, 4, 0, 0]));
    expect(leftRow([4, 4, 8, 0])).toEqual({ board: firstRow([8, 8, 0, 0]), score: 8, moved: true });
  });

  it('merges the pair closest to the destination wall first', () => {
    expect(leftRow([2, 2, 2, 0]).board).toEqual(firstRow([4, 2, 0, 0]));
    expect(impl.move(firstRow([2, 2, 2, 0]), 'right').board).toEqual(firstRow([0, 0, 2, 4]));
  });

  it('moves columns up and down', () => {
    const board: Board = [
      [2, 0, 0, 0],
      [2, 4, 0, 0],
      [0, 0, 0, 0],
      [4, 4, 0, 2],
    ];
    expect(impl.move(board, 'up')).toEqual({
      board: [
        [4, 8, 0, 2],
        [4, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
      ],
      score: 12,
      moved: true,
    });
    expect(impl.move(board, 'down').board).toEqual([
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [4, 0, 0, 0],
      [4, 8, 0, 2],
    ]);
  });

  it('reports moved: false when nothing changes and never mutates the input', () => {
    const board: Board = [
      [2, 4, 0, 0],
      [8, 0, 0, 0],
      [0, 0, 0, 0],
      [16, 2, 0, 0],
    ];
    const snapshot = structuredClone(board);
    const result = impl.move(board, 'left');
    expect(result).toEqual({ board: snapshot, score: 0, moved: false });
    impl.move(board, 'right');
    expect(board).toEqual(snapshot);
  });
});

describeTask('2048: spawnTile, hasWon, canMove', () => {
  it('spawns a 2 or a 4 on the chosen empty cell without mutating the input', () => {
    const board = firstRow([2, 0, 4, 0]);
    const rolls = (...values: number[]) => {
      const fn = vi.fn();
      values.forEach((v) => fn.mockReturnValueOnce(v));
      return fn;
    };
    // 14 empty cells: index 0 is (row 0, col 1)
    expect(impl.spawnTile(board, rolls(0, 0.5))).toEqual(firstRow([2, 2, 4, 0]));
    // index floor(0.99 * 14) = 13 is the last cell, and 0.95 ≥ 0.9 → 4
    const spawned = impl.spawnTile(board, rolls(0.99, 0.95));
    expect(spawned[3][3]).toBe(4);
    expect(board).toEqual(firstRow([2, 0, 4, 0]));
  });

  it('leaves a full board unchanged', () => {
    const full: Board = [
      [2, 4, 2, 4],
      [4, 2, 4, 2],
      [2, 4, 2, 4],
      [4, 2, 4, 2],
    ];
    const random = vi.fn(() => 0);
    expect(impl.spawnTile(full, random)).toEqual(structuredClone(full));
    expect(random).not.toHaveBeenCalled();
  });

  it('detects wins and available moves', () => {
    expect(impl.hasWon(firstRow([1024, 1024, 0, 0]))).toBe(false);
    expect(impl.hasWon(firstRow([2048, 0, 0, 0]))).toBe(true);

    const stuck: Board = [
      [2, 4, 2, 4],
      [4, 2, 4, 2],
      [2, 4, 2, 4],
      [4, 2, 4, 2],
    ];
    expect(impl.canMove(stuck)).toBe(false);
    const verticalPair = stuck.map((r) => [...r]);
    verticalPair[3][0] = 2; // equal to the tile above it
    expect(impl.canMove(verticalPair)).toBe(true);
    const withGap = stuck.map((r) => [...r]);
    withGap[1][1] = 0;
    expect(impl.canMove(withGap)).toBe(true);
  });
});

describeTask('2048: UI', () => {
  const zero = () => 0;
  const emptyCells = () => screen.getAllByLabelText(/^Row \d, Column \d, empty$/);

  it('starts from initialBoard, merges with the keyboard, scores and spawns one tile', async () => {
    const user = userEvent.setup();
    render(<Game2048 random={zero} initialBoard={firstRow([2, 2, 0, 0])} />);
    expect(emptyCells()).toHaveLength(14);
    expect(screen.getByText('Score: 0')).toBeInTheDocument();
    await user.keyboard('{ArrowLeft}');
    expect(screen.getByText('Score: 4')).toBeInTheDocument();
    expect(screen.getByLabelText('Row 1, Column 1, 4')).toBeInTheDocument();
    expect(screen.getByLabelText('Row 1, Column 2, 2')).toBeInTheDocument();
    expect(emptyCells()).toHaveLength(14);
  });

  it('does not spawn a tile when a move changes nothing', async () => {
    const user = userEvent.setup();
    render(<Game2048 random={zero} initialBoard={firstRow([2, 0, 0, 0])} />);
    await user.keyboard('{ArrowLeft}');
    await user.keyboard('{ArrowUp}');
    expect(emptyCells()).toHaveLength(15);
    await user.keyboard('{ArrowRight}');
    expect(screen.getByLabelText('Row 1, Column 4, 2')).toBeInTheDocument();
    expect(screen.getByLabelText('Row 1, Column 1, 2')).toBeInTheDocument();
    expect(emptyCells()).toHaveLength(14);
  });

  it('shows You win! after making 2048', async () => {
    const user = userEvent.setup();
    render(<Game2048 random={zero} initialBoard={firstRow([1024, 1024, 0, 0])} />);
    expect(screen.queryByText('You win!')).not.toBeInTheDocument();
    await user.keyboard('{ArrowLeft}');
    expect(screen.getByText('You win!')).toBeInTheDocument();
    expect(screen.getByText('Score: 2048')).toBeInTheDocument();
  });

  it('shows Game over for a stuck board and New game starts fresh', async () => {
    const user = userEvent.setup();
    const stuck: Board = [
      [2, 4, 2, 4],
      [4, 2, 4, 2],
      [2, 4, 2, 4],
      [4, 2, 4, 2],
    ];
    render(<Game2048 random={zero} initialBoard={stuck} />);
    expect(screen.getByText('Game over')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'New game' }));
    expect(screen.queryByText('Game over')).not.toBeInTheDocument();
    expect(screen.getByText('Score: 0')).toBeInTheDocument();
    expect(emptyCells()).toHaveLength(14);
    expect(screen.getByLabelText('Row 1, Column 1, 2')).toBeInTheDocument();
    expect(screen.getByLabelText('Row 1, Column 2, 2')).toBeInTheDocument();
  });
});
