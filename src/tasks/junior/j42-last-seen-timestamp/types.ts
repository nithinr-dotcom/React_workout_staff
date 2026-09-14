import type { ComponentType } from 'react';

/** Anything `new Date(x)` accepts: a Date, an ISO string or epoch milliseconds. */
export type DateInput = Date | string | number;

export interface LastSeenProps {
  /** When the user was last active. */
  date: DateInput;
  /** Returns the current epoch ms. Defaults to Date.now. */
  now?: () => number;
}

export interface LastSeenModule {
  /** Pure: formats `date` relative to `now`. See README for the exact rules. */
  formatLastSeen(date: DateInput, now: Date | number): string;
  /** Renders the formatted text in a <time> element and keeps it up to date. */
  default: ComponentType<LastSeenProps>;
}
