export type FlightType = 'one-way' | 'return';

export interface FlightBookerProps {
  /** Today's date as 'YYYY-MM-DD' in local time. Defaults to the local date of the device. */
  today?: string;
}
