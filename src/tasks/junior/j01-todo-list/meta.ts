import type { TaskMeta } from '../../../lib/types';

const meta: TaskMeta = {
  id: 'j01-todo-list',
  code: 'J01',
  title: 'Todo List',
  level: 'junior',
  order: 1,
  kind: 'app',
  minutes: 45,
  summary: 'Classic todo app: add, toggle, inline edit, delete, filters, clear completed and localStorage persistence.',
  concepts: ['controlled inputs', 'list keys', 'derived state', 'immutable updates', 'localStorage', 'inline editing'],
  companies: ['Google', 'Amazon', 'Atlassian', 'Flipkart', 'Swiggy', 'Razorpay'],
  prerequisites: [],
  frequency: 'very-common',
  star: true,
};

export default meta;
