import type { TabsProps } from './types';
import styles from './Solution.module.css';

// ⬇ Delete this line when you start. Tests for this task are skipped while it exists.
export const NOT_STARTED = true;

export default function Tabs({ tabs, defaultTabId }: TabsProps) {
  // Your implementation here. Requirements are in README.md.
  void defaultTabId;
  return <div className={styles.root}>Tabs with {tabs.length} tabs: start coding in Solution.tsx</div>;
}
