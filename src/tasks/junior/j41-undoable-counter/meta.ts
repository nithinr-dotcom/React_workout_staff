import type { TaskMeta } from '../../../lib/types';

const meta: TaskMeta = {
  id: 'j41-undoable-counter',
  code: 'J41',
  title: 'Undoable Counter',
  level: 'junior',
  order: 41,
  kind: 'ui',
  minutes: 35,
  summary: 'A counter with /2, -1, +1 and x2 operations, undo/redo stacks and a newest-first history table.',
  concepts: ['useReducer', 'undo/redo stacks', 'immutable updates', 'derived disabled state', 'accessible tables'],
  companies: [],
  prerequisites: ['j01-todo-list'],
  frequency: 'common',
};

export default meta;
