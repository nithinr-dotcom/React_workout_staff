// ⚠ Unverified: written before the reference solution. If a test looks wrong, trust the README.
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { pickTarget } from '../../../test/target';
import * as Reference from './Reference';
import * as Solution from './Solution';

const { impl, describeTask } = pickTarget(Solution, Reference);
const GridLights = impl.default;

const SQUARE: (0 | 1)[][] = [
  [1, 1],
  [1, 1],
];

const light = (row: number, col: number) => screen.getByRole('button', { name: `Row ${row}, Column ${col}` });
const pressed = (row: number, col: number) => light(row, col).getAttribute('aria-pressed');
const setup = () => userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
/** Advances one interval at a time, so timer chains driven by effects get a render between steps. */
const tick = (ms: number, times = 1) => {
  for (let i = 0; i < times; i++) act(() => vi.advanceTimersByTime(ms));
};

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});
afterEach(() => {
  vi.useRealTimers();
});

describeTask('GridLights', () => {
  it('renders the default 3×3 grid without a centre light, all off', () => {
    render(<GridLights />);
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(8);
    for (const b of buttons) expect(b).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByRole('button', { name: 'Row 2, Column 2' })).not.toBeInTheDocument();
    expect(light(2, 3)).toBeInTheDocument();
  });

  it('renders lights only where config has 1', () => {
    render(
      <GridLights
        config={[
          [0, 1, 0],
          [1, 1, 1],
        ]}
      />,
    );
    expect(screen.getAllByRole('button')).toHaveLength(4);
    expect(screen.queryByRole('button', { name: 'Row 1, Column 1' })).not.toBeInTheDocument();
    expect(light(1, 2)).toBeInTheDocument();
  });

  it('turns a light on when clicked', async () => {
    const user = setup();
    render(<GridLights config={SQUARE} />);
    await user.click(light(1, 2));
    expect(pressed(1, 2)).toBe('true');
    expect(pressed(1, 1)).toBe('false');
  });

  it('does not turn a light off when clicked again', async () => {
    const user = setup();
    render(<GridLights config={SQUARE} />);
    await user.click(light(1, 1));
    await user.click(light(1, 1));
    expect(pressed(1, 1)).toBe('true');
  });

  it('does not start switching off until every light is on', async () => {
    const user = setup();
    render(<GridLights config={SQUARE} interval={300} />);
    await user.click(light(1, 1));
    await user.click(light(1, 2));
    await user.click(light(2, 1));
    tick(300, 6);
    expect(pressed(1, 1)).toBe('true');
    expect(pressed(1, 2)).toBe('true');
    expect(pressed(2, 1)).toBe('true');
  });

  it('switches lights off in reverse activation order, one per interval', async () => {
    const user = setup();
    render(<GridLights config={SQUARE} interval={300} />);
    // Activation order: (2,2) → (1,1) → (2,1) → (1,2)
    await user.click(light(2, 2));
    await user.click(light(1, 1));
    await user.click(light(2, 1));
    await user.click(light(1, 2));

    tick(300);
    expect(pressed(1, 2)).toBe('false');
    expect(pressed(2, 1)).toBe('true');

    tick(300);
    expect(pressed(2, 1)).toBe('false');
    expect(pressed(1, 1)).toBe('true');

    tick(300);
    expect(pressed(1, 1)).toBe('false');
    expect(pressed(2, 2)).toBe('true');

    tick(300);
    expect(pressed(2, 2)).toBe('false');
  });

  it('disables every light during the sequence and re-enables them afterwards', async () => {
    const user = setup();
    render(<GridLights config={SQUARE} interval={300} />);
    await user.click(light(1, 1));
    await user.click(light(1, 2));
    await user.click(light(2, 1));
    await user.click(light(2, 2));
    for (const b of screen.getAllByRole('button')) expect(b).toBeDisabled();

    tick(300);
    // (2,2) is off now, but still can't be clicked mid-sequence.
    expect(light(2, 2)).toBeDisabled();

    tick(300, 3);
    for (const b of screen.getAllByRole('button')) {
      expect(b).toBeEnabled();
      expect(b).toHaveAttribute('aria-pressed', 'false');
    }
  });

  it('can play a second round', async () => {
    const user = setup();
    render(<GridLights config={[[1, 1]]} interval={100} />);
    await user.click(light(1, 1));
    await user.click(light(1, 2));
    tick(100, 2);
    await user.click(light(1, 2));
    expect(pressed(1, 2)).toBe('true');
    await user.click(light(1, 1));
    tick(100);
    expect(pressed(1, 1)).toBe('false');
    expect(pressed(1, 2)).toBe('true');
  });

  it('leaves no timers running after unmount', async () => {
    const user = setup();
    const { unmount } = render(<GridLights config={SQUARE} interval={300} />);
    await user.click(light(1, 1));
    await user.click(light(1, 2));
    await user.click(light(2, 1));
    await user.click(light(2, 2));
    tick(300);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
