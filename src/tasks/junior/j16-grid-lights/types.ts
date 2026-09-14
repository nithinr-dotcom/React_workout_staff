export interface GridLightsProps {
  /**
   * Rows of the grid. `1` renders a light, `0` renders an empty gap.
   * Default: [[1, 1, 1], [1, 0, 1], [1, 1, 1]] (a 3×3 grid without its centre).
   */
  config?: (0 | 1)[][];
  /** ms between deactivations once every light is on. Default 300. */
  interval?: number;
}
