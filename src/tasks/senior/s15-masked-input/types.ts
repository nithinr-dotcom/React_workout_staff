export interface MaskedInputProps {
  /** Visible label for the input. */
  label: string;
  /**
   * `#` is a digit slot; every other character is a literal.
   * e.g. "#### #### #### ####" or "(###) ###-####".
   */
  mask: string;
  /** Initial raw digits (uncontrolled). Extra digits beyond the mask are dropped. */
  defaultValue?: string;
  /** Called with the raw digits (no literals) whenever they change. */
  onChange?: (rawDigits: string) => void;
  placeholder?: string;
  /** Forwarded to the input, e.g. "cc-number" or "tel". */
  autoComplete?: string;
}
