import type { BarChartProps } from './types';
import styles from './Solution.module.css';

// ⬇ Delete this line when you start. Tests for this task are skipped while it exists.
export const NOT_STARTED = true;

export default function BarChart({ title, data, width = 600, height = 300, valueFormatter }: BarChartProps) {
  // Your implementation here. Requirements are in README.md.
  void width;
  void height;
  void valueFormatter;
  return (
    <div className={styles.root}>
      {title}: {data.length} bars. Start coding in Solution.tsx
    </div>
  );
}
