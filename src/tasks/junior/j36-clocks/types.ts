export type ClockMode = 'digital' | 'analog';

export interface ClockProps {
  mode: ClockMode;
  /**
   * Returns the current time. Read ALL time through this function.
   * Default: () => new Date(). Tests inject a fake clock or use fake timers.
   */
  now?: () => Date;
  /**
   * Follow-up 1: an IANA time zone such as "Asia/Tokyo". Hours, minutes and seconds
   * (and the hands) are shown in this zone. Default: the user's local time zone.
   */
  timeZone?: string;
}
