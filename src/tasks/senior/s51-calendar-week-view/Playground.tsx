import { useMemo, useState } from 'react';
import type { CalendarEvent, WeekViewModule } from './types';

function startOfWeek(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const mondayOffset = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - mondayOffset);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function demoEvents(weekStart: Date): CalendarEvent[] {
  const at = (dayOffset: number, hours: number, minutes = 0) => {
    const d = addDays(weekStart, dayOffset);
    d.setHours(hours, minutes, 0, 0);
    return d;
  };
  const rows: [string, number, number, number, number, number][] = [
    // title, day, startH, startM, endH, endM
    ['Standup', 0, 9, 0, 9, 30],
    ['Design review', 0, 9, 15, 10, 30],
    ['1:1 with Sam', 0, 10, 0, 10, 45],
    ['Deep work', 0, 13, 0, 16, 0],
    ['Lunch', 0, 12, 30, 13, 15],
    ['Standup', 1, 9, 0, 9, 30],
    ['Interview loop', 1, 11, 0, 12, 0],
    ['Interview debrief', 1, 11, 30, 12, 30],
    ['Hiring sync', 1, 11, 45, 12, 15],
    ['Standup', 2, 9, 0, 9, 30],
    ['Incident review', 2, 14, 0, 15, 0],
    ['Coffee', 2, 15, 0, 15, 30],
    ['Standup', 3, 9, 0, 9, 30],
    ['Sprint planning', 3, 10, 0, 12, 0],
    ['Arch sync', 3, 10, 30, 11, 30],
    ['Perf deep dive', 3, 11, 0, 11, 45],
    ['Standup', 4, 9, 0, 9, 30],
    ['Demo day', 4, 15, 0, 17, 0],
    ['Team drinks', 4, 17, 0, 19, 0],
    ['Brunch', 5, 11, 0, 12, 30],
  ];
  return rows.map(([title, dayOffset, sh, sm, eh, em], i) => ({
    id: `e${i}`,
    title,
    start: at(dayOffset, sh, sm),
    end: at(dayOffset, eh, em),
  }));
}

export default function Playground({ impl }: { impl: WeekViewModule }) {
  const WeekView = impl.default;
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const events = useMemo(() => demoEvents(startOfWeek(new Date())), []);
  const [clicked, setClicked] = useState<string>('nothing yet');

  let layoutDemo: string;
  try {
    layoutDemo = JSON.stringify(
      impl.layoutEvents([
        { id: 'a', start: 540, end: 600 },
        { id: 'b', start: 570, end: 630 },
        { id: 'c', start: 615, end: 660 },
      ]),
    );
  } catch (e) {
    layoutDemo = `Error: ${(e as Error).message}`;
  }

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <button onClick={() => setWeekStart((w) => addDays(w, -7))}>← Previous week</button>
        <button onClick={() => setWeekStart(startOfWeek(new Date()))}>This week</button>
        <button onClick={() => setWeekStart((w) => addDays(w, 7))}>Next week →</button>
        <span>
          Last clicked: <strong>{clicked}</strong>
        </span>
      </div>
      <p style={{ fontFamily: 'monospace', fontSize: 12, margin: 0 }}>
        layoutEvents(09:00–10:00, 09:30–10:30, 10:15–11:00) → {layoutDemo}
      </p>
      <div style={{ height: 560, border: '1px solid #d0d5dd', borderRadius: 8, overflow: 'hidden' }}>
        <WeekView events={events} weekStart={weekStart} onEventClick={(e) => setClicked(e.title)} />
      </div>
    </div>
  );
}
