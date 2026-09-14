import type { NestedCheckboxesProps } from './types';
import styles from './Solution.module.css';

// ⬇ Delete this line when you start. Tests for this task are skipped while it exists.
export const NOT_STARTED = true;

export default function NestedCheckboxes({ nodes, defaultSelectedIds = [], onChange }: NestedCheckboxesProps) {
  // Your implementation here. Requirements are in README.md.
  void defaultSelectedIds;
  void onChange;
  return <div className={styles.root}>Nested checkboxes with {nodes.length} top-level nodes: start coding in Solution.tsx</div>;
}
