export interface Point {
  x: number;
  y: number;
}

export interface Stroke {
  /** Any unique string. */
  id: string;
  color: string;
  size: number;
  points: Point[];
}

export interface ColorOption {
  /** Accessible name of the colour radio, e.g. "Red". */
  label: string;
  /** Any CSS colour, e.g. "#dc2626". Stored on the stroke. */
  value: string;
}

export const DEFAULT_COLORS: ColorOption[] = [
  { label: 'Black', value: '#111827' },
  { label: 'Red', value: '#dc2626' },
  { label: 'Blue', value: '#2563eb' },
  { label: 'Green', value: '#16a34a' },
];

export const DEFAULT_SIZES = [2, 4, 8, 16];

export interface DrawingCanvasProps {
  /** Canvas size in CSS pixels. Defaults 600 × 400. */
  width?: number;
  height?: number;
  /** Default DEFAULT_COLORS. The first one is selected initially. */
  colors?: ColorOption[];
  /** Default DEFAULT_SIZES. The second one (or the first if there is only one) is selected initially. */
  sizes?: number[];
  /** Starting drawing. It is the bottom of the history: it cannot be undone. */
  initialStrokes?: Stroke[];
  /** Called with the committed strokes every time they change (commit, undo, redo, clear). Not called on mount. */
  onChange?: (strokes: Stroke[]) => void;
}
