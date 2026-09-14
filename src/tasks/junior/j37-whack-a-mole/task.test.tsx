// ⚠ Unverified: written before the reference solution. If a test looks wrong, trust the README.
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { pickTarget } from '../../../test/target';
import * as Reference from './Reference';
import * as Solution from './Solution';
import { HIGH_SCORE_STORAGE_KEY, type WhackAMoleProps } from './types';

const { impl, describeTask, describeFollowUp } = pickTarget(Solution, Reference);
const WhackAMole = impl.default;

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});
afterEach(() => {
  vi.useRealTimers();
});

/** Advances fake timers in 100ms slices, each in its own act(), so React commits between ticks. */
function advance(ms: number) {
  for (let t = 0; t < ms; t += 100) {
    act(() => {
      vi.advanceTimersByTime(Math.min(100, ms - t));
    });
  }
}

/** Always picks the same value, e.g. 0.45 → Hole 5. */
const always = (value: number) => () => value;
/** Returns the given values in order, then repeats the last one. */
const sequence = (...values: number[]) => {
  let i = 0;
  return () => values[Math.min(i++, values.length - 1)];
};

const hole = (n: number) => screen.getByRole('button', { name: new RegExp(`^Hole ${n}, `) });
const moles = () => screen.queryAllByRole('button', { name: /^Hole \d, mole$/ });

function setup(props: WhackAMoleProps = {}) {
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  const utils = render(<WhackAMole popInterval={1000} upTime={700} {...props} />);
  return { user, ...utils };
}

describeTask('WhackAMole', () => {
  it('renders 9 empty holes, Start, score and full time before the game', () => {
    setup();
    expect(screen.getAllByRole('button', { name: /^Hole \d, empty$/ })).toHaveLength(9);
    expect(screen.getByRole('button', { name: 'Start' })).toBeInTheDocument();
    expect(screen.getByText('Score: 0')).toBeInTheDocument();
    expect(screen.getByText('Time left: 30')).toBeInTheDocument();
  });

  it('does nothing until Start is pressed', () => {
    const random = vi.fn(always(0.45));
    setup({ random });
    advance(5000);
    expect(moles()).toHaveLength(0);
    expect(screen.getByText('Time left: 30')).toBeInTheDocument();
    expect(random).not.toHaveBeenCalled();
  });

  it('pops a mole up in hole floor(random() * 9) after popInterval, and hides it after upTime', async () => {
    const { user } = setup({ random: always(0.45) });
    await user.click(screen.getByRole('button', { name: 'Start' }));
    advance(500);
    expect(moles()).toHaveLength(0);
    advance(700); // t ≈ 1200
    expect(hole(5)).toHaveAccessibleName('Hole 5, mole');
    expect(moles()).toHaveLength(1);
    advance(600); // t ≈ 1800
    expect(hole(5)).toHaveAccessibleName('Hole 5, empty');
    advance(400); // t ≈ 2200
    expect(hole(5)).toHaveAccessibleName('Hole 5, mole');
  });

  it('uses a new random hole for each pop-up', async () => {
    const random = vi.fn(sequence(0, 0.99, 0.5));
    const { user } = setup({ random });
    await user.click(screen.getByRole('button', { name: 'Start' }));
    advance(1200);
    expect(hole(1)).toHaveAccessibleName('Hole 1, mole');
    advance(1000);
    expect(hole(9)).toHaveAccessibleName('Hole 9, mole');
    expect(hole(1)).toHaveAccessibleName('Hole 1, empty');
    advance(1000);
    expect(hole(5)).toHaveAccessibleName('Hole 5, mole');
    expect(random).toHaveBeenCalledTimes(3);
  });

  it('scores once per whacked mole and hides it immediately', async () => {
    const { user } = setup({ random: always(0.45) });
    await user.click(screen.getByRole('button', { name: 'Start' }));
    advance(1200);
    await user.click(hole(5));
    expect(screen.getByText('Score: 1')).toBeInTheDocument();
    expect(hole(5)).toHaveAccessibleName('Hole 5, empty');
    await user.click(hole(5));
    expect(screen.getByText('Score: 1')).toBeInTheDocument();

    advance(1000); // next pop-up, same hole
    expect(hole(5)).toHaveAccessibleName('Hole 5, mole');
    await user.dblClick(hole(5));
    expect(screen.getByText('Score: 2')).toBeInTheDocument();
  });

  it('ignores clicks on empty holes', async () => {
    const { user } = setup({ random: always(0.45) });
    await user.click(screen.getByRole('button', { name: 'Start' }));
    advance(1200);
    await user.click(hole(1));
    await user.click(hole(9));
    expect(screen.getByText('Score: 0')).toBeInTheDocument();
    expect(hole(5)).toHaveAccessibleName('Hole 5, mole');
  });

  it('counts down once per second and ends the game with the final score', async () => {
    const { user } = setup({ duration: 5, random: always(0) });
    await user.click(screen.getByRole('button', { name: 'Start' }));
    advance(1200);
    expect(screen.getByText('Time left: 4')).toBeInTheDocument();
    await user.click(hole(1));
    advance(2000);
    expect(screen.getByText('Time left: 2')).toBeInTheDocument();

    advance(2000); // t ≈ 5200
    expect(screen.getByText(/Game over!/)).toBeInTheDocument();
    expect(screen.getByText(/Final score: 1/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Play again' })).toBeInTheDocument();
    expect(moles()).toHaveLength(0);

    advance(3000);
    expect(moles()).toHaveLength(0);
  });

  it('hides a mole that is up when time runs out and ignores clicks afterwards', async () => {
    const { user } = setup({ duration: 2, popInterval: 1500, upTime: 1000, random: always(0.45) });
    await user.click(screen.getByRole('button', { name: 'Start' }));
    advance(1700);
    expect(hole(5)).toHaveAccessibleName('Hole 5, mole');
    advance(500); // t ≈ 2200, mole would still be up without the game ending
    expect(screen.getByText(/Final score: 0/)).toBeInTheDocument();
    expect(hole(5)).toHaveAccessibleName('Hole 5, empty');
    await user.click(hole(5)).catch(() => {});
    expect(screen.getByText(/Final score: 0/)).toBeInTheDocument();
  });

  it('Play again resets the score and time and starts a new round', async () => {
    const { user } = setup({ duration: 3, random: always(0.45) });
    await user.click(screen.getByRole('button', { name: 'Start' }));
    advance(1200);
    await user.click(hole(5));
    advance(2000);
    expect(screen.getByText(/Final score: 1/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Play again' }));
    expect(screen.getByText('Score: 0')).toBeInTheDocument();
    expect(screen.getByText('Time left: 3')).toBeInTheDocument();
    expect(screen.queryByText(/Game over!/)).not.toBeInTheDocument();
    advance(1200);
    expect(screen.getByText('Time left: 2')).toBeInTheDocument();
    await user.click(hole(5));
    expect(screen.getByText('Score: 1')).toBeInTheDocument();
  });

  it('leaves no timers running after unmount', async () => {
    const { user, unmount } = setup({ random: always(0.45) });
    await user.click(screen.getByRole('button', { name: 'Start' }));
    advance(1200);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});

describeFollowUp(3, 'high score', () => {
  it('reads the stored high score and only replaces it when beaten', async () => {
    localStorage.setItem(HIGH_SCORE_STORAGE_KEY, '1');
    const { user } = setup({ duration: 3, random: always(0.45) });
    expect(screen.getByText('High score: 1')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Start' }));
    advance(2000);
    expect(screen.getByText('High score: 1')).toBeInTheDocument();
    advance(1200);
    expect(screen.getByText(/Final score: 0/)).toBeInTheDocument();
    expect(localStorage.getItem(HIGH_SCORE_STORAGE_KEY)).toBe('1');

    await user.click(screen.getByRole('button', { name: 'Play again' }));
    advance(1200);
    await user.click(hole(5));
    advance(1000);
    await user.click(hole(5));
    advance(1000);
    expect(screen.getByText(/Final score: 2/)).toBeInTheDocument();
    expect(screen.getByText('High score: 2')).toBeInTheDocument();
    expect(localStorage.getItem(HIGH_SCORE_STORAGE_KEY)).toBe('2');
  });

  it('treats a missing or corrupt value as 0', () => {
    localStorage.setItem(HIGH_SCORE_STORAGE_KEY, 'not a number');
    setup();
    expect(screen.getByText('High score: 0')).toBeInTheDocument();
  });
});
