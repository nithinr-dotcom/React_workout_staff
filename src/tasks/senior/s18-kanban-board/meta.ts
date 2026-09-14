import type { TaskMeta } from '../../../lib/types';

const meta: TaskMeta = {
  id: 's18-kanban-board',
  code: 'S18',
  title: 'Kanban Board',
  level: 'senior',
  order: 18,
  kind: 'app',
  minutes: 90,
  summary: 'Trello-style board: add, edit, delete and move cards across columns with drag and drop and an accessible fallback, persisted to localStorage.',
  concepts: [
    'normalized state',
    'useReducer',
    'HTML5 drag and drop',
    'accessible alternatives to drag',
    'localStorage persistence',
    'focus management',
  ],
  companies: ['Atlassian', 'Rippling', 'Zomato'],
  prerequisites: ['j01-todo-list', 'j25-hooks-pack'],
  frequency: 'very-common',
  star: true,
};

export default meta;
