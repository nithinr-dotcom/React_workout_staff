export interface OtpInputProps {
  /** Number of digit boxes. Default 6. */
  length?: number;
  /** Called with the full code whenever an edit changes the code and every box is filled. */
  onComplete?: (code: string) => void;
  /** Called with every box's value (`''` for empty boxes) whenever the code changes. */
  onChange?: (digits: string[]) => void;
  /** Focus the first box on mount. Default false. */
  autoFocus?: boolean;
  /** Disable every box. Default false. */
  disabled?: boolean;
}
