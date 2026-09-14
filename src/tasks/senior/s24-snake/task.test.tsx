// ⚠ Unverified: written before the reference solution. If a test looks wrong, trust the README.
import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { pickTarget } from '../../../test/target';
import * as Reference from './Reference';
import * as Solution from './Solution';
import type { Point, SnakeState } from './types';

const { impl, describeTask } = pickTarget(Solution, Reference);
const Snake = impl.default;

const zero = () => 0;
const pts = (...pairs: [number, number][]): Point[] => pairs.map(([x, y]) => ({ x, y }));
const state = (overrides: Partial<SnakeState>): SnakeState => ({
  size: 10,
  snake: pts([5, 5], [4, 5], [3, 5]),
  direction: 'right',
  food: { x: 0, y: 0 },
  score: 0,
  status: 'playing',
  ...overrides,
});

describeTask('Snake: pure logic', () => {
  it('createInitialState centres a length-3 snake heading right and places food', () => {
    expect(impl.createInitialState(10, zero)).toEqual(state({}));
    expect(impl.createInitialState(10, () => 0.9999).food).toEqual({ x: 9, y: 9 });
  });

  it('placeFood picks free cells in row-major order and returns null when the grid is full', () => {
    const snake = pts([0, 0]);
    expect(impl.placeFood(snake, 2, () => 0)).toEqual({ x: 1, y: 0 });
    expect(impl.placeFood(snake, 2, () => 0.5)).toEqual({ x: 0, y: 1 });
    expect(impl.placeFood(snake, 2, () => 0.99)).toEqual({ x: 1, y: 1 });
    expect(impl.placeFood(pts([0, 0], [1, 0], [1, 1], [0, 1]), 2, () => 0.5)).toBeNull();
  });

  it('moves forward one cell without mutating the input', () => {
    const before = state({});
    const snapshot = structuredClone(before);
    const after = impl.step(before, 'right', zero);
    expect(after.snake).toEqual(pts([6, 5], [5, 5], [4, 5]));
    expect(after.status).toBe('playing');
    expect(after.score).toBe(0);
    expect(before).toEqual(snapshot);
  });

  it('turns, and ignores a reversal into its own neck', () => {
    const up = impl.step(state({}), 'up', zero);
    expect(up.snake).toEqual(pts([5, 4], [5, 5], [4, 5]));
    expect(up.direction).toBe('up');

    const reversed = impl.step(state({}), 'left', zero);
    expect(reversed.snake).toEqual(pts([6, 5], [5, 5], [4, 5]));
    expect(reversed.direction).toBe('right');
    expect(reversed.status).toBe('playing');
  });

  it('grows, scores and re-places food when eating', () => {
    const before = state({ size: 5, snake: pts([2, 2], [1, 2]), food: { x: 3, y: 2 } });
    const after = impl.step(before, 'right', zero);
    expect(after.snake).toEqual(pts([3, 2], [2, 2], [1, 2]));
    expect(after.score).toBe(1);
    expect(after.food).toEqual({ x: 0, y: 0 });
  });

  it('ends the game at a wall and then stops changing', () => {
    const before = state({ size: 5, snake: pts([4, 2], [3, 2]), score: 3 });
    const over = impl.step(before, 'right', zero);
    expect(over.status).toBe('over');
    expect(over.snake).toEqual(before.snake);
    expect(over.score).toBe(3);
    expect(over.food).toEqual(before.food);
    expect(impl.step(over, 'up', zero)).toEqual(over);
  });

  it('ends the game when the head hits its body', () => {
    // head at (2,2) moving up; turning right hits the segment at (3,2)
    const before = state({ size: 5, snake: pts([2, 2], [2, 3], [3, 3], [3, 2], [3, 1]), direction: 'up' });
    const after = impl.step(before, 'right', zero);
    expect(after.status).toBe('over');
    expect(after.snake).toEqual(before.snake);
  });

  it('allows moving into the cell the tail is leaving', () => {
    const before = state({ size: 5, snake: pts([2, 2], [2, 3], [3, 3], [3, 2]), direction: 'up' });
    const after = impl.step(before, 'right', zero);
    expect(after.status).toBe('playing');
    expect(after.snake).toEqual(pts([3, 2], [2, 2], [2, 3], [3, 3]));
  });
});

describeTask('Snake: UI', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  const advance = (ms: number) =>
    act(() => {
      vi.advanceTimersByTime(ms);
    });
  const key = (k: string) => fireEvent.keyDown(document.body, { key: k });

  it('starts moving on mount and ends at the wall', () => {
    render(<Snake size={10} tickMs={100} random={zero} />);
    expect(screen.getByText('Score: 0')).toBeInTheDocument();
    advance(400);
    expect(screen.queryByText('Game over')).not.toBeInTheDocument();
    advance(100);
    expect(screen.getByText('Game over')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Play again' })).toBeInTheDocument();
  });

  it('buffers two turns pressed within one tick and applies one per tick', () => {
    render(<Snake size={10} tickMs={100} random={zero} />);
    // Moving right from (5,5): up → (5,4), then left → x decreases until it leaves the grid on tick 7.
    key('ArrowUp');
    key('a');
    advance(600);
    expect(screen.queryByText('Game over')).not.toBeInTheDocument();
    advance(100);
    expect(screen.getByText('Game over')).toBeInTheDocument();
  });

  it('pauses and resumes with Space', () => {
    render(<Snake size={10} tickMs={100} random={zero} />);
    key(' ');
    expect(screen.getByText('Paused')).toBeInTheDocument();
    advance(2000);
    expect(screen.queryByText('Game over')).not.toBeInTheDocument();
    key(' ');
    expect(screen.queryByText('Paused')).not.toBeInTheDocument();
    advance(400);
    expect(screen.queryByText('Game over')).not.toBeInTheDocument();
    advance(100);
    expect(screen.getByText('Game over')).toBeInTheDocument();
  });

  it('Play again restarts from a fresh state', () => {
    render(<Snake size={10} tickMs={100} random={zero} />);
    advance(500);
    fireEvent.click(screen.getByRole('button', { name: 'Play again' }));
    expect(screen.queryByText('Game over')).not.toBeInTheDocument();
    expect(screen.getByText('Score: 0')).toBeInTheDocument();
    advance(500);
    expect(screen.getByText('Game over')).toBeInTheDocument();
  });
});
