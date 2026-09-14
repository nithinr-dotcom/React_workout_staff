export interface StarRatingProps {
  /** Number of stars. Default 5. */
  max?: number;
  /** Controlled value (0 = no rating). When provided, the parent owns the state. */
  value?: number;
  /** Starting value in uncontrolled mode. Default 0. */
  defaultValue?: number;
  /** Called with the new value (0 when cleared). */
  onChange?: (value: number) => void;
  /** Display only: no hover preview, clicks and keys do nothing. */
  readOnly?: boolean;
  /** Accessible name of the group. Default "Rating". */
  label?: string;
}
