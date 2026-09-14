// ⚠ Unverified: written before the reference solution. If a test looks wrong, trust the README.
import { act, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { pickTarget } from '../../../test/target';
import * as Reference from './Reference';
import * as Solution from './Solution';

const { impl, describeTask } = pickTarget(Solution, Reference);
const LastSeen = impl.default;
const { formatLastSeen } = impl;

const SEC = 1000;
const MIN = 60 * SEC;
// Local-time constructors keep these tests independent of the machine's time zone. July avoids DST changes.
const NOW = new Date(2026, 6, 15, 14, 30); // Wed 15 Jul 2026, 14:30 local

afterEach(() => {
  vi.useRealTimers();
});

describeTask('formatLastSeen', () => {
  it('returns "online" under a minute (including future dates), then whole minutes', () => {
    expect(formatLastSeen(NOW, NOW)).toBe('online');
    expect(formatLastSeen(new Date(NOW.getTime() - 59 * SEC), NOW)).toBe('online');
    expect(formatLastSeen(new Date(NOW.getTime() + 5 * MIN), NOW)).toBe('online');
    expect(formatLastSeen(new Date(NOW.getTime() - 60 * SEC), NOW)).toBe('last seen 1 minute ago');
    expect(formatLastSeen(new Date(NOW.getTime() - 5 * MIN - 30 * SEC), NOW)).toBe('last seen 5 minutes ago');
    expect(formatLastSeen(new Date(NOW.getTime() - 60 * MIN + 1 * SEC), NOW)).toBe('last seen 59 minutes ago');
  });

  it('returns "today at HH:mm" / "yesterday at HH:mm" from one hour on', () => {
    expect(formatLastSeen(new Date(2026, 6, 15, 13, 30), NOW)).toBe('last seen today at 13:30');
    expect(formatLastSeen(new Date(2026, 6, 15, 9, 5), NOW)).toBe('last seen today at 09:05');
    expect(formatLastSeen(new Date(2026, 6, 15, 0, 0), NOW)).toBe('last seen today at 00:00');
    expect(formatLastSeen(new Date(2026, 6, 14, 23, 59), NOW)).toBe('last seen yesterday at 23:59');
    expect(formatLastSeen(new Date(2026, 6, 14, 0, 1), NOW)).toBe('last seen yesterday at 00:01');
  });

  it('uses the minute rule across midnight and calendar days, not 24h windows', () => {
    const justAfterMidnight = new Date(2026, 6, 16, 0, 20);
    expect(formatLastSeen(new Date(2026, 6, 15, 23, 50), justAfterMidnight)).toBe('last seen 30 minutes ago');
    expect(formatLastSeen(new Date(2026, 6, 15, 23, 0), justAfterMidnight)).toBe('last seen yesterday at 23:00');
    expect(formatLastSeen(new Date(2026, 6, 14, 23, 0), justAfterMidnight)).toBe('last seen on 14 Jul');
    const newYear = new Date(2026, 0, 1, 0, 30);
    expect(formatLastSeen(new Date(2025, 11, 31, 23, 0), newYear)).toBe('last seen yesterday at 23:00');
  });

  it('returns "on D Mon" earlier in the same year and adds the year otherwise', () => {
    expect(formatLastSeen(new Date(2026, 6, 13, 10, 0), NOW)).toBe('last seen on 13 Jul');
    expect(formatLastSeen(new Date(2026, 2, 12, 8, 0), NOW)).toBe('last seen on 12 Mar');
    expect(formatLastSeen(new Date(2026, 0, 5, 8, 0), NOW)).toBe('last seen on 5 Jan');
    expect(formatLastSeen(new Date(2024, 2, 12, 8, 0), NOW)).toBe('last seen on 12 Mar 2024');
    expect(formatLastSeen(new Date(2025, 11, 25, 8, 0), NOW)).toBe('last seen on 25 Dec 2025');
  });

  it('accepts ISO strings and epoch ms, and handles invalid input', () => {
    const fiveMinAgo = new Date(NOW.getTime() - 5 * MIN);
    expect(formatLastSeen(fiveMinAgo.toISOString(), NOW.getTime())).toBe('last seen 5 minutes ago');
    expect(formatLastSeen(fiveMinAgo.getTime(), NOW)).toBe('last seen 5 minutes ago');
    expect(formatLastSeen('not a date', NOW)).toBe('last seen recently');
    expect(formatLastSeen(Number.NaN, NOW)).toBe('last seen recently');
  });
});

describeTask('<LastSeen>', () => {
  function setup(date: Date | string, systemTime: Date = NOW) {
    vi.useFakeTimers();
    vi.setSystemTime(systemTime);
    const utils = render(<LastSeen date={date} now={() => Date.now()} />);
    return utils;
  }
  const advance = (ms: number) =>
    act(() => {
      vi.advanceTimersByTime(ms);
    });

  it('renders the text in a <time> with dateTime and title', () => {
    const date = new Date(NOW.getTime() - 5 * MIN);
    const { unmount } = setup(date);
    const time = screen.getByText('last seen 5 minutes ago').closest('time');
    expect(time).not.toBeNull();
    expect(time).toHaveAttribute('datetime', date.toISOString());
    expect(time?.getAttribute('title')?.trim()).toBeTruthy();
    unmount();

    render(<LastSeen date="garbage" now={() => Date.now()} />);
    expect(screen.getByText('last seen recently')).toBeInTheDocument();
  });

  it('updates the minute count every minute', () => {
    setup(new Date(NOW.getTime() - 5 * MIN));
    expect(screen.getByText('last seen 5 minutes ago')).toBeInTheDocument();
    advance(60 * SEC);
    expect(screen.getByText('last seen 6 minutes ago')).toBeInTheDocument();
    advance(60 * SEC);
    expect(screen.getByText('last seen 7 minutes ago')).toBeInTheDocument();
  });

  it('switches from minutes to "today at" after an hour', () => {
    setup(new Date(2026, 6, 15, 13, 31));
    expect(screen.getByText('last seen 59 minutes ago')).toBeInTheDocument();
    advance(60 * SEC);
    expect(screen.getByText('last seen today at 13:31')).toBeInTheDocument();
  });

  it('switches from "today" to "yesterday" right after midnight', () => {
    setup(new Date(2026, 6, 15, 10, 0), new Date(2026, 6, 15, 23, 59, 30));
    expect(screen.getByText('last seen today at 10:00')).toBeInTheDocument();
    advance(60 * SEC);
    expect(screen.getByText('last seen yesterday at 10:00')).toBeInTheDocument();
  });

  it('updates immediately when the date prop changes', () => {
    const { rerender } = setup(new Date(2026, 6, 13, 10, 0));
    expect(screen.getByText('last seen on 13 Jul')).toBeInTheDocument();
    rerender(<LastSeen date={new Date(NOW.getTime() - 10 * SEC)} now={() => Date.now()} />);
    expect(screen.getByText('online')).toBeInTheDocument();
    advance(60 * SEC);
    expect(screen.getByText('last seen 1 minute ago')).toBeInTheDocument();
  });

  it('stops updating after unmount', () => {
    const { unmount } = setup(new Date(NOW.getTime() - 5 * MIN));
    unmount();
    expect(() => advance(10 * MIN)).not.toThrow();
    expect(vi.getTimerCount()).toBe(0);
  });
});
