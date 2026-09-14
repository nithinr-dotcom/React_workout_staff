import type { ComponentType } from 'react';

/** Input to the pure layout function. Times are minutes since local midnight: `start` inclusive, `end` exclusive. */
export interface TimedEvent {
  id: string;
  start: number;
  end: number;
}

/** Output of the pure layout function: one entry per input event. */
export interface EventLayout {
  id: string;
  /** Minutes from the top of the day column. Equal to `start`. */
  top: number;
  /** Minutes. Equal to `end - start`. */
  height: number;
  /** Percent of the day column's width, 0–100. */
  left: number;
  /** Percent of the day column's width, 0–100. */
  width: number;
}

export interface CalendarEvent {
  id: string;
  title: string;
  /** Local time. */
  start: Date;
  /** Local time, after `start`. */
  end: Date;
}

export interface WeekViewProps {
  events: CalendarEvent[];
  /** Local midnight of the first day shown. The view shows 7 consecutive days from here. */
  weekStart: Date;
  onEventClick?: (event: CalendarEvent) => void;
  /** Injected clock for the now indicator. Default `() => new Date()`. */
  now?: () => Date;
}

export interface WeekViewModule {
  default: ComponentType<WeekViewProps>;
  /** Lays out one day's events. Returns one layout per event; order doesn't matter. Never mutates the input. */
  layoutEvents(events: TimedEvent[]): EventLayout[];
}
