import type { TrafficLightProps } from './types';
import styles from './Solution.module.css';

// ⬇ Delete this line when you start. Tests for this task are skipped while it exists.
export const NOT_STARTED = true;

export default function TrafficLight({ durations, initialColor = 'red' }: TrafficLightProps) {
  // Your implementation here. Requirements are in README.md.
  void durations;
  return <div className={styles.root}>Traffic light (starts {initialColor}): start coding in Solution.tsx</div>;
}
