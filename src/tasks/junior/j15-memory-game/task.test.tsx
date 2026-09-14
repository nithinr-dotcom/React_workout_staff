// ⚠ Unverified: written before the reference solution. If a test looks wrong, trust the README.
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { pickTarget } from '../../../test/target';
import * as Reference from './Reference';
import * as Solution from './Solution';
import type { MemoryCard } from './types';

const { impl, describeTask } = pickTarget(Solution, Reference);
const MemoryGame = impl.default;

const SYMBOLS = ['A', 'B', 'C'];
// Unshuffled deck is A, B, C, A, B, C → pairs are (1,4), (2,5), (3,6).
const identity = (cards: MemoryCard[]) => cards;

const card = (n: number) => screen.getByRole('button', { name: new RegExp(`^Card ${n},`) });
const setup = () => userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});
afterEach(() => {
  vi.useRealTimers();
});

describeTask('MemoryGame', () => {
  it('deals symbols twice through shuffle, all face down, with 0 moves', () => {
    const shuffle = vi.fn(identity);
    render(<MemoryGame symbols={SYMBOLS} shuffle={shuffle} />);
    expect(shuffle).toHaveBeenCalled();
    const deck = shuffle.mock.calls[0][0];
    expect(deck.map((c) => c.symbol)).toEqual(['A', 'B', 'C', 'A', 'B', 'C']);
    expect(new Set(deck.map((c) => c.id)).size).toBe(6);
    expect(screen.getAllByRole('button', { name: /^Card \d+, face down$/ })).toHaveLength(6);
    expect(screen.getByText('Moves: 0')).toBeInTheDocument();
  });

  it('renders cards in the order shuffle returns', async () => {
    const user = setup();
    render(<MemoryGame symbols={SYMBOLS} shuffle={(cards) => [...cards].reverse()} />);
    await user.click(card(1));
    expect(card(1)).toHaveAccessibleName('Card 1, C');
  });

  it('flips a card face up without counting a move', async () => {
    const user = setup();
    render(<MemoryGame symbols={SYMBOLS} shuffle={identity} />);
    await user.click(card(2));
    expect(card(2)).toHaveAccessibleName('Card 2, B');
    expect(screen.getByText('Moves: 0')).toBeInTheDocument();
  });

  it('keeps a matching pair face up and counts the move', async () => {
    const user = setup();
    render(<MemoryGame symbols={SYMBOLS} shuffle={identity} />);
    await user.click(card(1));
    await user.click(card(4));
    expect(card(1)).toHaveAccessibleName('Card 1, A, matched');
    expect(card(4)).toHaveAccessibleName('Card 4, A, matched');
    expect(screen.getByText('Moves: 1')).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(5000));
    expect(card(1)).toHaveAccessibleName('Card 1, A, matched');
  });

  it('flips a mismatched pair back after mismatchDelay', async () => {
    const user = setup();
    render(<MemoryGame symbols={SYMBOLS} shuffle={identity} mismatchDelay={1000} />);
    await user.click(card(1));
    await user.click(card(2));
    expect(card(1)).toHaveAccessibleName('Card 1, A');
    expect(card(2)).toHaveAccessibleName('Card 2, B');
    expect(screen.getByText('Moves: 1')).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(800));
    expect(card(2)).toHaveAccessibleName('Card 2, B');
    act(() => vi.advanceTimersByTime(300));
    expect(card(1)).toHaveAccessibleName('Card 1, face down');
    expect(card(2)).toHaveAccessibleName('Card 2, face down');
  });

  it('ignores clicks while a mismatched pair is showing', async () => {
    const user = setup();
    render(<MemoryGame symbols={SYMBOLS} shuffle={identity} mismatchDelay={1000} />);
    await user.click(card(1));
    await user.click(card(2));
    await user.click(card(3)).catch(() => {});
    expect(card(3)).toHaveAccessibleName('Card 3, face down');
    expect(screen.getByText('Moves: 1')).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1100));
    await user.click(card(3));
    expect(card(3)).toHaveAccessibleName('Card 3, C');
  });

  it('does not count clicking the same face-up card twice', async () => {
    const user = setup();
    render(<MemoryGame symbols={SYMBOLS} shuffle={identity} />);
    await user.click(card(1));
    await user.click(card(1));
    expect(card(1)).toHaveAccessibleName('Card 1, A');
    expect(screen.getByText('Moves: 0')).toBeInTheDocument();
  });

  it('shows the win message when every pair is matched', async () => {
    const user = setup();
    render(<MemoryGame symbols={SYMBOLS} shuffle={identity} />);
    await user.click(card(1));
    await user.click(card(2)); // miss
    act(() => vi.advanceTimersByTime(1100));
    for (const [a, b] of [[1, 4], [2, 5], [3, 6]]) {
      await user.click(card(a));
      await user.click(card(b));
    }
    expect(screen.getByText('Moves: 4')).toBeInTheDocument();
    expect(screen.getByText('You won in 4 moves!')).toBeInTheDocument();
  });

  it('Restart resets moves and cards, reshuffles, and cancels a pending flip-back', async () => {
    const user = setup();
    const shuffle = vi.fn(identity);
    render(<MemoryGame symbols={SYMBOLS} shuffle={shuffle} mismatchDelay={1000} />);
    await user.click(card(1));
    await user.click(card(4)); // match
    await user.click(card(2));
    await user.click(card(3)); // mismatch, flip-back pending
    const callsBefore = shuffle.mock.calls.length;
    await user.click(screen.getByRole('button', { name: 'Restart' }));
    expect(shuffle.mock.calls.length).toBeGreaterThan(callsBefore);
    expect(screen.getByText('Moves: 0')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /^Card \d+, face down$/ })).toHaveLength(6);

    // Start a new flip; the old timer must not flip it back.
    await user.click(card(5));
    act(() => vi.advanceTimersByTime(1100));
    expect(card(5)).toHaveAccessibleName('Card 5, B');
  });
});
