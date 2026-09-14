import type { TaskMeta } from '../../../lib/types';

const meta: TaskMeta = {
  id: 's06-nested-comments',
  code: 'S06',
  title: 'Nested Comments',
  level: 'senior',
  order: 6,
  kind: 'ui',
  minutes: 75,
  summary: 'A Reddit-style comment thread: reply at any depth, edit and delete your own comments, upvote, collapse threads and sort.',
  concepts: [
    'recursive components',
    'normalized state',
    'useReducer',
    'immutable tree updates',
    'inline forms',
    'derived sorting',
    'focus management',
  ],
  companies: ['Uber', 'Namaste Dev', 'Reddit', 'Atlassian'],
  prerequisites: ['j01-todo-list', 'j02-accordion'],
  frequency: 'very-common',
  star: true,
};

export default meta;
