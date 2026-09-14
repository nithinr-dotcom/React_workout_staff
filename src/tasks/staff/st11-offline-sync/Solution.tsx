import type { OfflineTodosProps, SyncEngine, SyncEngineOptions } from './types';
import styles from './Solution.module.css';

// ⬇ Delete this line when you start. Tests for this task are skipped while it exists.
export const NOT_STARTED = true;

export function createSyncEngine(options: SyncEngineOptions): SyncEngine {
  // Your implementation here. Requirements are in README.md.
  void options;
  throw new Error('createSyncEngine: not implemented');
}

export default function OfflineTodos({ engine }: OfflineTodosProps) {
  // Your implementation here. Requirements are in README.md.
  void engine;
  return <div className={styles.root}>OfflineTodos: start coding in Solution.tsx</div>;
}
