// ⚠ Unverified: written before the reference solution. If a test looks wrong, trust the README.
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { pickTarget } from '../../../test/target';
import * as Reference from './Reference';
import * as Solution from './Solution';

const { impl, describeTask, describeFollowUp } = pickTarget(Solution, Reference);
const Clock = impl.default;

/** Local time on an arbitrary day. */
const at = (h: number, m: number, s: number, ms = 0) => new Date(2024, 0, 15, h, m, s, ms);

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

/**
 * userEvent + React Testing Library need real time to pass while awaiting, so tests that click
 * switch to fake timers that also advance with real time. Boundary-sensitive tests don't click.
 */
function clickSetup() {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  return userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
}

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

function timeEl(container: HTMLElement) {
  const times = container.querySelectorAll('time');
  expect(times).toHaveLength(1);
  return times[0];
}

function angle(hand: 'Hour' | 'Minute' | 'Second') {
  const el = screen.getByRole('img', { name: new RegExp(`^${hand} hand at -?[\\d.]+ degrees$`) });
  const label = el.getAttribute('aria-label') ?? el.textContent ?? '';
  return Number(/at (-?[\d.]+) degrees/.exec(label)![1]);
}

function expectAngle(hand: 'Hour' | 'Minute' | 'Second', expected: number, tolerance: number) {
  const actual = angle(hand);
  expect(actual).toBeGreaterThanOrEqual(0);
  expect(actual).toBeLessThan(360);
  const diff = Math.abs(actual - expected);
  expect(Math.min(diff, 360 - diff), `${hand} hand: got ${actual}, expected ${expected}`).toBeLessThanOrEqual(tolerance);
}

describeTask('Clock: digital', () => {
  it('renders the current time immediately inside <time dateTime>', () => {
    vi.setSystemTime(at(9, 5, 3));
    const { container } = render(<Clock mode="digital" />);
    const time = timeEl(container);
    expect(time).toHaveAttribute('dateTime', '09:05:03');
    expect(time).toHaveTextContent('09:05:03');
  });

  it('ticks on the next whole-second boundary, then every second', () => {
    vi.setSystemTime(at(14, 5, 9, 700));
    const { container } = render(<Clock mode="digital" />);
    expect(timeEl(container)).toHaveTextContent('14:05:09');
    advance(250);
    expect(timeEl(container)).toHaveTextContent('14:05:09');
    advance(100);
    expect(timeEl(container)).toHaveTextContent('14:05:10');
    advance(1000);
    expect(timeEl(container)).toHaveTextContent('14:05:11');
    advance(60_000);
    expect(timeEl(container)).toHaveTextContent('14:06:11');
    expect(timeEl(container)).toHaveAttribute('dateTime', '14:06:11');
  });

  it('rolls over midnight', () => {
    vi.setSystemTime(at(23, 59, 59));
    const { container } = render(<Clock mode="digital" />);
    advance(1000);
    expect(timeEl(container)).toHaveTextContent('00:00:00');
  });

  it('toggles between 24-hour and 12-hour formats', async () => {
    const user = clickSetup();
    vi.setSystemTime(at(14, 5, 9));
    const { container } = render(<Clock mode="digital" />);
    const toggle = screen.getByRole('button', { name: '24-hour' });
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    await user.click(toggle);
    expect(screen.getByRole('button', { name: '24-hour' })).toHaveAttribute('aria-pressed', 'false');
    expect(timeEl(container)).toHaveTextContent(/02:05:09\s*PM/);
    expect(timeEl(container)).toHaveAttribute('dateTime', '14:05:09');
    await user.click(screen.getByRole('button', { name: '24-hour' }));
    expect(timeEl(container)).toHaveTextContent('14:05:09');
  });

  it('shows midnight and noon as 12 in 12-hour format', async () => {
    const user = clickSetup();
    vi.setSystemTime(at(0, 30, 0));
    const first = render(<Clock mode="digital" />);
    await user.click(screen.getByRole('button', { name: '24-hour' }));
    expect(timeEl(first.container)).toHaveTextContent(/12:30:00\s*AM/);
    first.unmount();

    vi.setSystemTime(at(12, 0, 0));
    const second = render(<Clock mode="digital" />);
    await user.click(screen.getByRole('button', { name: '24-hour' }));
    expect(timeEl(second.container)).toHaveTextContent(/12:00:00\s*PM/);
  });

  it('reads the time through the injected now()', () => {
    vi.setSystemTime(at(10, 0, 0));
    const offset = at(3, 15, 42).getTime() - Date.now();
    const { container } = render(<Clock mode="digital" now={() => new Date(Date.now() + offset)} />);
    expect(timeEl(container)).toHaveAttribute('dateTime', '03:15:42');
    advance(1000);
    expect(timeEl(container)).toHaveTextContent('03:15:43');
  });
});

describeTask('Clock: analog', () => {
  it('points the hands at 3 o’clock', () => {
    vi.setSystemTime(at(3, 0, 0));
    const { container } = render(<Clock mode="analog" />);
    expectAngle('Hour', 90, 0.5);
    expectAngle('Minute', 0, 0.1);
    expectAngle('Second', 0, 0.1);
    expect(timeEl(container)).toHaveAttribute('dateTime', '03:00:00');
  });

  it('moves the hour hand with the minutes and the minute hand with the seconds', () => {
    vi.setSystemTime(at(14, 30, 45));
    render(<Clock mode="analog" />);
    expectAngle('Hour', 75, 0.5);
    expectAngle('Minute', 184.5, 0.1);
    expectAngle('Second', 270, 0.1);
  });

  it('rotates the hands as time passes', () => {
    vi.setSystemTime(at(14, 30, 45, 500));
    const { container } = render(<Clock mode="analog" />);
    advance(600);
    expectAngle('Second', 276, 0.1);
    expectAngle('Minute', 184.6, 0.1);
    advance(14_000);
    expectAngle('Second', 0, 0.1);
    expectAngle('Minute', 186, 0.1);
    expectAngle('Hour', 75.5, 0.5);
    expect(timeEl(container)).toHaveAttribute('dateTime', '14:31:00');
  });

  it('switches modes when the prop changes and keeps ticking', () => {
    vi.setSystemTime(at(8, 0, 0));
    const { container, rerender } = render(<Clock mode="digital" />);
    rerender(<Clock mode="analog" />);
    expectAngle('Hour', 240, 0.5);
    advance(2000);
    expectAngle('Second', 12, 0.1);
    rerender(<Clock mode="digital" />);
    expect(timeEl(container)).toHaveTextContent('08:00:02');
  });

  it('leaves no timers running after unmount', () => {
    vi.setSystemTime(at(8, 0, 0, 400));
    const digital = render(<Clock mode="digital" />);
    const analog = render(<Clock mode="analog" />);
    advance(3000);
    digital.unmount();
    analog.unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});

describeFollowUp(1, 'world clock', () => {
  it('shows the time in the given IANA time zone', () => {
    vi.setSystemTime(new Date(Date.UTC(2024, 0, 15, 0, 0, 0)));
    const digital = render(<Clock mode="digital" timeZone="Asia/Kolkata" />);
    expect(timeEl(digital.container)).toHaveAttribute('dateTime', '05:30:00');
    expect(timeEl(digital.container)).toHaveTextContent('05:30:00');
    digital.unmount();

    render(<Clock mode="analog" timeZone="America/New_York" />);
    // 00:00 UTC on 15 Jan is 19:00 the day before in New York (UTC−5).
    expectAngle('Hour', 210, 0.5);
    expectAngle('Minute', 0, 0.1);
  });
});
