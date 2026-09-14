import type { TaskMeta } from '../../../lib/types';

const meta: TaskMeta = {
  id: 's20-undo-redo-canvas',
  code: 'S20',
  title: 'Undo/Redo Drawing Canvas',
  level: 'senior',
  order: 20,
  kind: 'app',
  minutes: 75,
  summary: 'Pointer-driven drawing on <canvas> with strokes modelled as data, colour/size pickers and undo/redo history.',
  concepts: [
    'history stacks (past/present/future)',
    'pointer events',
    'canvas 2D rendering from state',
    'refs for in-progress interactions',
    'global keyboard shortcuts',
    'useReducer',
  ],
  companies: ['Figma', 'Canva', 'Miro', 'Atlassian'],
  prerequisites: ['j01-todo-list'],
  frequency: 'common',
};

export default meta;
