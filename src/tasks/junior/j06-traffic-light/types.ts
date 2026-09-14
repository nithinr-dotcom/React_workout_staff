export type LightColor = 'red' | 'yellow' | 'green';

/** How long each light stays on, in ms. */
export type LightDurations = Record<LightColor, number>;

export const DEFAULT_DURATIONS: LightDurations = { red: 4000, green: 3000, yellow: 1000 };

export interface TrafficLightProps {
  /** Overrides for some or all durations. Missing keys use DEFAULT_DURATIONS. */
  durations?: Partial<LightDurations>;
  /** Light shown on mount. Default 'red'. */
  initialColor?: LightColor;
}
