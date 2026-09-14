import type { EventLayout, TimedEvent, WeekViewProps } from './types';
import styles from './Solution.module.css';

// ⬇ Delete this line when you start. Tests for this task are skipped while it exists.
export const NOT_STARTED = true;

export function layoutEvents(events: TimedEvent[]): EventLayout[] {
  // Your implementation here. Requirements are in README.md.
  void events;
  throw new Error('layoutEvents: not implemented');
}

export default function WeekView({ events, weekStart, onEventClick, now }: WeekViewProps) {
  // Your implementation here. Requirements are in README.md.
  void onEventClick;
  void now;
  return (
    <div className={styles.root}>
      Week of {weekStart.toDateString()} with {events.length} events: start coding in Solution.tsx
    </div>
  );
}
