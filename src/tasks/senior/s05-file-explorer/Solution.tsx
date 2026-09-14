import type { FileExplorerProps } from './types';
import styles from './Solution.module.css';

// ⬇ Delete this line when you start. Tests for this task are skipped while it exists.
export const NOT_STARTED = true;

export default function FileExplorer({ initialTree, defaultExpandedIds = [], onSelect }: FileExplorerProps) {
  // Your implementation here. Requirements are in README.md.
  void defaultExpandedIds;
  void onSelect;
  return (
    <div className={styles.root}>File explorer with {initialTree.length} root items: start coding in Solution.tsx</div>
  );
}
