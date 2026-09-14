/** A calendar date as `yyyy-mm-dd`, e.g. "2026-09-15". No time, no time zone. */
export type IsoDate = string;

export interface DatePickerProps {
  /** Visible label for the date input. */
  label: string;
  /** Selected date, or null. Controlled. */
  value: IsoDate | null;
  onChange: (value: IsoDate | null) => void;
  /** "Today" for highlighting and the initial month. Defaults to the real current local date. */
  today?: IsoDate;
  /** Earliest selectable date (inclusive). */
  min?: IsoDate;
  /** Latest selectable date (inclusive). */
  max?: IsoDate;
}
