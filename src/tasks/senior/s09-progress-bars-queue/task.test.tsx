import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { pickTarget } from '../../../test/target';
import * as Reference from './Reference';
import * as Solution from './Solution';

const { impl, describeTask } = pickTarget(Solution, Reference);
const ProgressQueue = impl.default;

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});
afterEach(() => {
  vi.useRealTimers();
});

const setupUser = () => userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms));
const bar = (n: number) => screen.getByRole('progressbar', { name: `Bar ${n}` });
const value = (n: number) => Number(bar(n).getAttribute('aria-valuenow'));

async function addBars(user: ReturnType<typeof setupUser>, count: number) {
  for (let i = 0; i < count; i++) await user.click(screen.getByRole('button', { name: 'Add' }));
}

describeTask('ProgressQueue', () => {
  it('renders the controls and no bars initially', () => {
    render(<ProgressQueue />);
    expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reset' })).toBeInTheDocument();
    expect(screen.queryAllByRole('progressbar')).toHaveLength(0);
  });

  it('adds numbered progress bars with the progressbar attributes', async () => {
    const user = setupUser();
    render(<ProgressQueue duration={1000} />);
    await addBars(user, 2);
    expect(screen.getAllByRole('progressbar')).toHaveLength(2);
    expect(bar(1)).toHaveAttribute('aria-valuemin', '0');
    expect(bar(1)).toHaveAttribute('aria-valuemax', '100');
    expect(Number.isInteger(value(1))).toBe(true);
    expect(value(2)).toBeLessThan(20);
  });

  it('fills a bar linearly over `duration` ms and stops at 100', async () => {
    const user = setupUser();
    render(<ProgressQueue duration={1000} />);
    await addBars(user, 1);
    advance(500);
    expect(value(1)).toBeGreaterThanOrEqual(35);
    expect(value(1)).toBeLessThanOrEqual(65);
    advance(700);
    expect(value(1)).toBe(100);
    advance(5000);
    expect(value(1)).toBe(100);
  });

  it('runs at most 3 bars at once by default and queues the rest at 0', async () => {
    const user = setupUser();
    render(<ProgressQueue duration={1000} />);
    await addBars(user, 5);
    advance(500);
    for (const n of [1, 2, 3]) expect(value(n)).toBeGreaterThan(20);
    expect(value(4)).toBe(0);
    expect(value(5)).toBe(0);
  });

  it('starts the oldest queued bar as soon as a running one finishes', async () => {
    const user = setupUser();
    render(<ProgressQueue duration={1000} concurrency={1} />);
    await addBars(user, 3);
    advance(500);
    expect(value(1)).toBeGreaterThanOrEqual(35);
    expect(value(2)).toBe(0);
    advance(1000); // ~1500ms total
    expect(value(1)).toBe(100);
    expect(value(2)).toBeGreaterThanOrEqual(35);
    expect(value(2)).toBeLessThanOrEqual(65);
    expect(value(3)).toBe(0);
    advance(1100); // ~2600ms total
    expect(value(2)).toBe(100);
    expect(value(3)).toBeGreaterThan(0);
  });

  it('starts a newly added bar immediately when a slot is free', async () => {
    const user = setupUser();
    render(<ProgressQueue duration={1000} concurrency={2} />);
    await addBars(user, 1);
    advance(500);
    await addBars(user, 1);
    advance(250);
    expect(value(1)).toBeGreaterThanOrEqual(60);
    expect(value(2)).toBeGreaterThanOrEqual(10);
    expect(value(2)).toBeLessThanOrEqual(40);
  });

  it('pauses all running bars and resumes from where they stopped', async () => {
    const user = setupUser();
    render(<ProgressQueue duration={1000} />);
    await addBars(user, 2);
    advance(500);
    await user.click(screen.getByRole('button', { name: 'Pause' }));
    expect(screen.getByRole('button', { name: 'Resume' })).toBeInTheDocument();
    const frozen = value(1);
    advance(3000);
    expect(value(1)).toBe(frozen);
    expect(value(1)).toBeLessThan(100);

    await user.click(screen.getByRole('button', { name: 'Resume' }));
    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
    advance(250);
    expect(value(1)).toBeGreaterThan(frozen);
    expect(value(1)).toBeLessThan(100);
    advance(400);
    expect(value(1)).toBe(100);
    expect(value(2)).toBe(100);
  });

  it('does not start bars added while paused until resumed', async () => {
    const user = setupUser();
    render(<ProgressQueue duration={1000} />);
    await user.click(screen.getByRole('button', { name: 'Pause' }));
    await addBars(user, 1);
    advance(1000);
    expect(value(1)).toBe(0);
    await user.click(screen.getByRole('button', { name: 'Resume' }));
    advance(500);
    expect(value(1)).toBeGreaterThanOrEqual(35);
    expect(value(1)).toBeLessThanOrEqual(65);
  });

  it('reset removes all bars, restarts numbering and un-pauses', async () => {
    const user = setupUser();
    render(<ProgressQueue duration={1000} />);
    await addBars(user, 3);
    advance(300);
    await user.click(screen.getByRole('button', { name: 'Pause' }));
    await user.click(screen.getByRole('button', { name: 'Reset' }));
    expect(screen.queryAllByRole('progressbar')).toHaveLength(0);
    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();

    await addBars(user, 1);
    expect(screen.getAllByRole('progressbar')).toHaveLength(1);
    expect(value(1)).toBeLessThan(20);
    advance(500);
    expect(value(1)).toBeGreaterThanOrEqual(35);
  });

  it('finishes a chain of queued bars on schedule', async () => {
    const user = setupUser();
    render(<ProgressQueue duration={1000} concurrency={1} />);
    await addBars(user, 3);
    // Bars 1 and 2 finish back to back; bar 3 is roughly half done.
    advance(2500);
    expect(value(1)).toBe(100);
    expect(value(2)).toBe(100);
    advance(600);
    expect(value(3)).toBe(100);
  });
});
