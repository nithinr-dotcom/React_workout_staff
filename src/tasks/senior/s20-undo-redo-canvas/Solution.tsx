import { DEFAULT_COLORS, DEFAULT_SIZES, type DrawingCanvasProps } from './types';
import styles from './Solution.module.css';

// ⬇ Delete this line when you start. Tests for this task are skipped while it exists.
export const NOT_STARTED = true;

export default function DrawingCanvas({
  width = 600,
  height = 400,
  colors = DEFAULT_COLORS,
  sizes = DEFAULT_SIZES,
  initialStrokes = [],
  onChange,
}: DrawingCanvasProps) {
  // Your implementation here. Requirements are in README.md.
  void colors;
  void sizes;
  void initialStrokes;
  void onChange;
  return (
    <div className={styles.root}>
      Drawing canvas ({width}×{height}): start coding in Solution.tsx
    </div>
  );
}
