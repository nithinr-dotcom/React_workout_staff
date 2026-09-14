import { useState, type ComponentType } from 'react';
import type { BoardState, KanbanBoardProps } from './types';

const STORAGE_KEY = 'kanban-playground';

const DEMO_BOARD: BoardState = {
  columnOrder: ['todo', 'in-progress', 'done'],
  columns: {
    todo: { id: 'todo', title: 'Todo', cardIds: ['t1', 't2', 't3'] },
    'in-progress': { id: 'in-progress', title: 'In Progress', cardIds: ['t4', 't5'] },
    done: { id: 'done', title: 'Done', cardIds: ['t6'] },
  },
  cards: {
    t1: { id: 't1', title: 'Write RFC for checkout redesign' },
    t2: { id: 't2', title: 'Audit color contrast on dashboard' },
    t3: { id: 't3', title: 'Add retry to payment webhook' },
    t4: { id: 't4', title: 'Migrate tables to virtualized grid' },
    t5: { id: 't5', title: 'Fix focus trap in modal' },
    t6: { id: 't6', title: 'Set up Vitest + RTL' },
  },
};

export default function Playground({ impl }: { impl: { default: ComponentType<KanbanBoardProps> } }) {
  const KanbanBoard = impl.default;
  const [instance, setInstance] = useState(0);

  const reset = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    setInstance((n) => n + 1);
  };

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <button type="button" onClick={reset}>
          Reset board
        </button>
        <span style={{ color: '#667085', fontSize: 13 }}>
          Stored under <code>localStorage["{STORAGE_KEY}"]</code>. Reload the page or open a second tab to check persistence.
        </span>
      </div>
      <KanbanBoard key={instance} initialBoard={DEMO_BOARD} storageKey={STORAGE_KEY} />
    </div>
  );
}
