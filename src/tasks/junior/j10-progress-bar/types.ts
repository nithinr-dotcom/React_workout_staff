export interface ProgressBarProps {
  /** Percentage complete. Values outside 0–100 are clamped; NaN is treated as 0. */
  value: number;
  /** Visible label and accessible name, e.g. "Uploading report.pdf". */
  label: string;
  /** Show the rounded percentage text next to the bar. Default true. */
  showValue?: boolean;
  /** Follow-up 1: progress is unknown; value is ignored. Default false. */
  indeterminate?: boolean;
}
