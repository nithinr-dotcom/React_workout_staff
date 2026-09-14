// ⚠ Unverified: written before the reference solution. If a test looks wrong, trust the README.
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { pickTarget } from '../../../test/target';
import * as Reference from './Reference';
import * as Solution from './Solution';

const { impl, describeTask } = pickTarget(Solution, Reference);
const StopwatchCountdown = impl.default;

let clock = 0;
const now = () => clock;

beforeEach(() => {
  clock = 10_000;
  vi.useFakeTimers({
    shouldAdvanceTime: true,
    toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'requestAnimationFrame', 'cancelAnimationFrame'],
  });
});
afterEach(() => {
  vi.useRealTimers();
});

/**
 * Moves the injected clock by `clockMs`, then lets fake timers run for `timerMs` so the UI refreshes.
 * Timers advance in 50ms slices, each in its own act(), so React commits between ticks like a browser would.
 */
function advance(clockMs: number, timerMs = 300) {
  clock += clockMs;
  for (let t = 0; t < timerMs; t += 50) {
    act(() => {
      vi.advanceTimersByTime(50);
    });
  }
}

function setup(props: { onCountdownComplete?: () => void } = {}) {
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  const utils = render(<StopwatchCountdown now={now} {...props} />);
  const stopwatch = within(screen.getByRole('region', { name: 'Stopwatch' }));
  const countdown = within(screen.getByRole('region', { name: 'Countdown' }));
  return { user, stopwatch, countdown, ...utils };
}

describeTask('StopwatchCountdown: stopwatch', () => {
  it('starts at 00:00.000 and shows elapsed ms from the clock, not from tick counts', async () => {
    const { user, stopwatch } = setup();
    expect(stopwatch.getByRole('timer')).toHaveTextContent('00:00.000');
    await user.click(stopwatch.getByRole('button', { name: 'Start' }));
    advance(1234, 100);
    expect(stopwatch.getByRole('timer')).toHaveTextContent('00:01.234');
    expect(stopwatch.queryByRole('button', { name: 'Start' })).not.toBeInTheDocument();
  });

  it('Stop freezes the time and Start resumes from it', async () => {
    const { user, stopwatch } = setup();
    await user.click(stopwatch.getByRole('button', { name: 'Start' }));
    advance(1234);
    await user.click(stopwatch.getByRole('button', { name: 'Stop' }));
    expect(stopwatch.getByRole('timer')).toHaveTextContent('00:01.234');

    advance(5000);
    expect(stopwatch.getByRole('timer')).toHaveTextContent('00:01.234');

    await user.click(stopwatch.getByRole('button', { name: 'Start' }));
    advance(766);
    expect(stopwatch.getByRole('timer')).toHaveTextContent('00:02.000');
  });

  it('records lap splits, newest first', async () => {
    const { user, stopwatch } = setup();
    expect(stopwatch.getByRole('button', { name: 'Lap' })).toBeDisabled();
    await user.click(stopwatch.getByRole('button', { name: 'Start' }));
    advance(1000);
    await user.click(stopwatch.getByRole('button', { name: 'Lap' }));
    advance(500);
    await user.click(stopwatch.getByRole('button', { name: 'Lap' }));

    const laps = within(stopwatch.getByRole('list', { name: 'Laps' })).getAllByRole('listitem');
    expect(laps).toHaveLength(2);
    expect(laps[0]).toHaveTextContent('Lap 2');
    expect(laps[0]).toHaveTextContent('00:00.500');
    expect(laps[1]).toHaveTextContent('Lap 1');
    expect(laps[1]).toHaveTextContent('00:01.000');
  });

  it('Reset is only available when stopped and clears time and laps', async () => {
    const { user, stopwatch } = setup();
    expect(stopwatch.getByRole('button', { name: 'Reset' })).toBeDisabled();
    await user.click(stopwatch.getByRole('button', { name: 'Start' }));
    advance(2000);
    await user.click(stopwatch.getByRole('button', { name: 'Lap' }));
    expect(stopwatch.getByRole('button', { name: 'Reset' })).toBeDisabled();
    await user.click(stopwatch.getByRole('button', { name: 'Stop' }));
    await user.click(stopwatch.getByRole('button', { name: 'Reset' }));
    expect(stopwatch.getByRole('timer')).toHaveTextContent('00:00.000');
    expect(stopwatch.queryAllByRole('listitem')).toHaveLength(0);
  });
});

describeTask('StopwatchCountdown: countdown', () => {
  async function startCountdown(user: ReturnType<typeof userEvent.setup>, countdown: ReturnType<typeof within>, minutes: string, seconds: string) {
    await user.clear(countdown.getByRole('spinbutton', { name: 'Minutes' }));
    await user.type(countdown.getByRole('spinbutton', { name: 'Minutes' }), minutes);
    await user.clear(countdown.getByRole('spinbutton', { name: 'Seconds' }));
    await user.type(countdown.getByRole('spinbutton', { name: 'Seconds' }), seconds);
    await user.click(countdown.getByRole('button', { name: 'Start' }));
  }

  it('shows the entered duration and disables Start when it is zero', async () => {
    const { user, countdown } = setup();
    await user.clear(countdown.getByRole('spinbutton', { name: 'Minutes' }));
    await user.type(countdown.getByRole('spinbutton', { name: 'Minutes' }), '0');
    await user.clear(countdown.getByRole('spinbutton', { name: 'Seconds' }));
    await user.type(countdown.getByRole('spinbutton', { name: 'Seconds' }), '0');
    expect(countdown.getByRole('button', { name: 'Start' })).toBeDisabled();
    await user.clear(countdown.getByRole('spinbutton', { name: 'Minutes' }));
    await user.type(countdown.getByRole('spinbutton', { name: 'Minutes' }), '2');
    await user.clear(countdown.getByRole('spinbutton', { name: 'Seconds' }));
    await user.type(countdown.getByRole('spinbutton', { name: 'Seconds' }), '5');
    expect(countdown.getByRole('timer')).toHaveTextContent('02:05');
    expect(countdown.getByRole('button', { name: 'Start' })).toBeEnabled();
  });

  it('counts down using the clock, rounding up to whole seconds', async () => {
    const { user, countdown } = setup();
    await startCountdown(user, countdown, '0', '3');
    expect(countdown.getByRole('spinbutton', { name: 'Seconds' })).toBeDisabled();
    advance(400);
    expect(countdown.getByRole('timer')).toHaveTextContent('00:03');
    advance(600);
    expect(countdown.getByRole('timer')).toHaveTextContent('00:02');
    advance(1000);
    expect(countdown.getByRole('timer')).toHaveTextContent('00:01');
  });

  it('pauses and resumes from the remaining time', async () => {
    const { user, countdown } = setup();
    await startCountdown(user, countdown, '1', '0');
    advance(10_000);
    expect(countdown.getByRole('timer')).toHaveTextContent('00:50');
    await user.click(countdown.getByRole('button', { name: 'Pause' }));
    advance(30_000);
    expect(countdown.getByRole('timer')).toHaveTextContent('00:50');
    await user.click(countdown.getByRole('button', { name: 'Start' }));
    advance(20_000);
    expect(countdown.getByRole('timer')).toHaveTextContent('00:30');
  });

  it('completes once: shows 00:00, "Time\'s up!" and calls onCountdownComplete exactly once', async () => {
    const onCountdownComplete = vi.fn();
    const { user, countdown } = setup({ onCountdownComplete });
    await startCountdown(user, countdown, '0', '2');
    advance(2000);
    expect(countdown.getByRole('timer')).toHaveTextContent('00:00');
    expect(screen.getByRole('alert')).toHaveTextContent("Time's up!");
    expect(onCountdownComplete).toHaveBeenCalledTimes(1);
    advance(5000);
    expect(onCountdownComplete).toHaveBeenCalledTimes(1);
    expect(countdown.getByRole('button', { name: 'Start' })).toBeInTheDocument();
  });

  it('Reset restores the entered duration', async () => {
    const { user, countdown } = setup();
    await startCountdown(user, countdown, '0', '10');
    advance(4000);
    await user.click(countdown.getByRole('button', { name: 'Reset' }));
    expect(countdown.getByRole('timer')).toHaveTextContent('00:10');
    expect(countdown.getByRole('spinbutton', { name: 'Seconds' })).toBeEnabled();
  });

  it('leaves no running timers after unmount', async () => {
    const { user, stopwatch, countdown, unmount } = setup();
    await user.click(stopwatch.getByRole('button', { name: 'Start' }));
    await startCountdown(user, countdown, '0', '30');
    advance(1000);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
