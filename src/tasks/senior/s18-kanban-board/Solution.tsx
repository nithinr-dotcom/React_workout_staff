import type { KanbanBoardProps } from './types';
import styles from './Solution.module.css';

// ⬇ Delete this line when you start. Tests for this task are skipped while it exists.
export const NOT_STARTED = true;

export default function KanbanBoard({ initialBoard, storageKey = 'kanban-board' }: KanbanBoardProps) {
  // Your implementation here. Requirements are in README.md.
  void initialBoard;
  void storageKey;
  return <div className={styles.root}>KanbanBoard: start coding in Solution.tsx</div>;
}
