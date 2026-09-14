// ⚠ Unverified: written before the reference solution. If a test looks wrong, trust the README.
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { pickTarget } from '../../../test/target';
import * as Reference from './Reference';
import * as Solution from './Solution';
import type { CalendarEvent, EventLayout, TimedEvent } from './types';

const { impl, describeTask } = pickTarget(Solution, Reference);
const WeekView = impl.default;

const h = (hours: number, minutes = 0) => hours * 60 + minutes;

function layout(events: TimedEvent[]): Record<string, EventLayout> {
  const result = impl.layoutEvents(events);
  expect(result).toHaveLength(events.length);
  return Object.fromEntries(result.map((l) => [l.id, l]));
}

function expectBox(box: EventLayout, expected: { left: number; width: number }) {
  expect(box.left).toBeCloseTo(expected.left, 1);
  expect(box.width).toBeCloseTo(expected.width, 1);
}

const collide = (a: TimedEvent, b: TimedEvent) => a.start < b.end && b.start < a.end;

describeTask('layoutEvents (pure)', () => {
  it('gives a lone event full width, with top = start and height = duration in minutes', () => {
    const input = [{ id: 'a', start: h(9), end: h(10, 30) }];
    const copy = structuredClone(input);
    const { a } = layout(input);
    expect(a.top).toBe(h(9));
    expect(a.height).toBe(90);
    expectBox(a, { left: 0, width: 100 });
    expect(input).toEqual(copy);
    expect(impl.layoutEvents([])).toEqual([]);
  });

  it('gives full width to events that do not collide, including touching events', () => {
    const boxes = layout([
      { id: 'a', start: h(9), end: h(10) },
      { id: 'b', start: h(10), end: h(11) },
      { id: 'c', start: h(14), end: h(15) },
    ]);
    for (const id of ['a', 'b', 'c']) expectBox(boxes[id], { left: 0, width: 100 });
  });

  it('splits two overlapping events 50/50, earlier start on the left, regardless of input order', () => {
    const boxes = layout([
      { id: 'late', start: h(9, 30), end: h(11) },
      { id: 'early', start: h(9), end: h(10) },
    ]);
    expectBox(boxes.early, { left: 0, width: 50 });
    expectBox(boxes.late, { left: 50, width: 50 });
  });

  it('splits three mutually overlapping events into thirds', () => {
    const boxes = layout([
      { id: 'a', start: h(9), end: h(12) },
      { id: 'b', start: h(10), end: h(12) },
      { id: 'c', start: h(11), end: h(12) },
    ]);
    expectBox(boxes.a, { left: 0, width: 100 / 3 });
    expectBox(boxes.b, { left: 100 / 3, width: 100 / 3 });
    expectBox(boxes.c, { left: 200 / 3, width: 100 / 3 });
  });

  it('matches the classic layOutDay example', () => {
    // Facebook's original input, in minutes after 9am: [30,150], [540,600], [560,620], [610,670]
    const boxes = layout([
      { id: '1', start: h(9, 30), end: h(11, 30) },
      { id: '2', start: h(18), end: h(19) },
      { id: '3', start: h(18, 20), end: h(19, 20) },
      { id: '4', start: h(19, 10), end: h(20, 10) },
    ]);
    expectBox(boxes['1'], { left: 0, width: 100 });
    expectBox(boxes['2'], { left: 0, width: 50 });
    expectBox(boxes['3'], { left: 50, width: 50 });
    expectBox(boxes['4'], { left: 0, width: 50 });
  });

  it('shares one width across a transitive cluster and reuses freed columns', () => {
    const boxes = layout([
      { id: 'long', start: h(9), end: h(12) },
      { id: 'short1', start: h(9), end: h(10) },
      { id: 'short2', start: h(10, 30), end: h(11, 30) },
      { id: 'tail', start: h(11, 45), end: h(13) },
      { id: 'alone', start: h(15), end: h(16) },
    ]);
    // long + short1 overlap, short1 ends before short2 starts, tail overlaps long only.
    expect(boxes.long.width).toBeCloseTo(50, 1);
    expect(boxes.short1.width).toBeCloseTo(50, 1);
    expect(boxes.short2.width).toBeCloseTo(50, 1);
    expect(boxes.tail.width).toBeCloseTo(50, 1);
    expect(boxes.short1.left).toBeCloseTo(boxes.short2.left, 1);
    expect(boxes.long.left).not.toBeCloseTo(boxes.short1.left, 1);
    expect(boxes.tail.left).not.toBeCloseTo(boxes.long.left, 1);
    expectBox(boxes.alone, { left: 0, width: 100 });
  });

  it('satisfies the layout rules on a larger generated day', () => {
    // Deterministic pseudo-random events.
    let seed = 42;
    const rand = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed / 2147483648;
    };
    const events: TimedEvent[] = Array.from({ length: 60 }, (_, i) => {
      const start = Math.floor(rand() * 96) * 15;
      const end = Math.min(24 * 60, start + (1 + Math.floor(rand() * 8)) * 15);
      return { id: `e${i}`, start, end };
    });
    const boxes = layout(events);

    // Clusters (connected components of the collision graph).
    const parent = events.map((_, i) => i);
    const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
    for (let i = 0; i < events.length; i++)
      for (let j = i + 1; j < events.length; j++) if (collide(events[i], events[j])) parent[find(i)] = find(j);

    // Columns needed per cluster = the most events that overlap at a single instant.
    const needed = new Map<number, number>();
    for (let i = 0; i < events.length; i++) {
      const atStart = events.filter((e) => e.start <= events[i].start && events[i].start < e.end).length;
      const root = find(i);
      needed.set(root, Math.max(needed.get(root) ?? 0, atStart));
    }

    const eps = 0.01;
    events.forEach((e, i) => {
      const box = boxes[e.id];
      expect(box.top).toBe(e.start);
      expect(box.height).toBe(e.end - e.start);
      expect(box.left).toBeGreaterThanOrEqual(-eps);
      expect(box.left + box.width).toBeLessThanOrEqual(100 + eps);
      expect(box.width).toBeCloseTo(100 / needed.get(find(i))!, 1);
      events.forEach((other, j) => {
        if (j <= i || !collide(e, other)) return;
        const o = boxes[other.id];
        expect(box.width).toBeCloseTo(o.width, 1);
        const separate = box.left + box.width <= o.left + eps || o.left + o.width <= box.left + eps;
        expect(separate).toBe(true);
      });
    });
  });
});

const WEEK_START = new Date(2026, 8, 14); // Monday 14 September 2026
const at = (day: number, hours: number, minutes = 0) => new Date(2026, 8, day, hours, minutes);

const EVENTS: CalendarEvent[] = [
  { id: 'review', title: 'Design review', start: at(14, 11), end: at(14, 12) },
  { id: 'standup', title: 'Standup', start: at(14, 9), end: at(14, 9, 30) },
  { id: 'lunch', title: 'Lunch', start: at(16, 12, 30), end: at(16, 13, 15) },
  { id: 'lastweek', title: 'Retro', start: at(11, 15), end: at(11, 16) },
  { id: 'nextweek', title: 'Planning', start: at(21, 10), end: at(21, 11) },
];

const day = (name: string) => screen.getByRole('group', { name });

describeTask('WeekView (component)', () => {
  it('renders seven labelled day columns and a 24-hour gutter', () => {
    render(<WeekView events={[]} weekStart={WEEK_START} now={() => at(1, 0)} />);
    for (const name of [
      'Monday, September 14',
      'Tuesday, September 15',
      'Wednesday, September 16',
      'Thursday, September 17',
      'Friday, September 18',
      'Saturday, September 19',
      'Sunday, September 20',
    ]) {
      expect(day(name)).toBeInTheDocument();
    }
    expect(screen.getByText('00:00')).toBeInTheDocument();
    expect(screen.getByText('08:00')).toBeInTheDocument();
    expect(screen.getByText('23:00')).toBeInTheDocument();
    // now() is outside this week, so there is no now indicator.
    expect(screen.queryByLabelText(/^Current time/)).not.toBeInTheDocument();
  });

  it('puts each event in its day as a named button, sorted by start time, and skips other weeks', () => {
    render(<WeekView events={EVENTS} weekStart={WEEK_START} now={() => at(1, 0)} />);
    const monday = within(day('Monday, September 14')).getAllByRole('button');
    expect(monday.map((b) => b.getAttribute('aria-label') ?? b.textContent)).toEqual([
      expect.stringContaining('Standup'),
      expect.stringContaining('Design review'),
    ]);
    expect(within(day('Monday, September 14')).getByRole('button', { name: 'Standup, 09:00 to 09:30' })).toBeInTheDocument();
    expect(
      within(day('Wednesday, September 16')).getByRole('button', { name: 'Lunch, 12:30 to 13:15' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Retro/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Planning/ })).not.toBeInTheDocument();
  });

  it('calls onEventClick with the original event, by click and keyboard', async () => {
    const onEventClick = vi.fn();
    const user = userEvent.setup();
    render(<WeekView events={EVENTS} weekStart={WEEK_START} onEventClick={onEventClick} now={() => at(1, 0)} />);
    await user.click(screen.getByRole('button', { name: 'Lunch, 12:30 to 13:15' }));
    expect(onEventClick).toHaveBeenLastCalledWith(EVENTS[2]);
    screen.getByRole('button', { name: 'Standup, 09:00 to 09:30' }).focus();
    await user.keyboard('{Enter}');
    expect(onEventClick).toHaveBeenLastCalledWith(EVENTS[1]);
  });

  it('renders overlapping events in the same day as separate buttons', () => {
    const overlapping: CalendarEvent[] = [
      { id: 'a', title: 'One', start: at(15, 10), end: at(15, 11) },
      { id: 'b', title: 'Two', start: at(15, 10, 30), end: at(15, 11, 30) },
    ];
    render(<WeekView events={overlapping} weekStart={WEEK_START} now={() => at(1, 0)} />);
    const tuesday = within(day('Tuesday, September 15'));
    expect(tuesday.getByRole('button', { name: 'One, 10:00 to 11:00' })).toBeInTheDocument();
    expect(tuesday.getByRole('button', { name: 'Two, 10:30 to 11:30' })).toBeInTheDocument();
  });

  it("shows the now indicator in today's column and moves it every minute", () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    let current = new Date(2026, 8, 16, 10, 15, 0);
    render(<WeekView events={EVENTS} weekStart={WEEK_START} now={() => current} />);
    expect(within(day('Wednesday, September 16')).getByLabelText('Current time, 10:15')).toBeInTheDocument();
    expect(within(day('Monday, September 14')).queryByLabelText(/^Current time/)).not.toBeInTheDocument();

    current = new Date(2026, 8, 16, 10, 16, 0);
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(screen.getByLabelText('Current time, 10:16')).toBeInTheDocument();
    expect(screen.queryByLabelText('Current time, 10:15')).not.toBeInTheDocument();
  });
});
