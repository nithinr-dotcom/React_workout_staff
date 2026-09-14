export interface BarDatum {
  /** Category label, unique within the chart. */
  label: string;
  /** Non-negative value. */
  value: number;
}

export interface BarChartProps {
  /** Chart title. Names the figure. */
  title: string;
  data: BarDatum[];
  /** viewBox width in SVG units. Default 600. The SVG itself scales to its container. */
  width?: number;
  /** viewBox height in SVG units. Default 300. */
  height?: number;
  /** Formats values for tooltips, aria-labels and tick labels. Default: String(value). */
  valueFormatter?: (value: number) => string;
}
