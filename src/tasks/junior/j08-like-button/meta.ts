import type { TaskMeta } from '../../../lib/types';

const meta: TaskMeta = {
  id: 'j08-like-button',
  code: 'J08',
  title: 'Like Button',
  level: 'junior',
  order: 8,
  kind: 'ui',
  minutes: 30,
  summary: 'A toggle button with optimistic updates, rollback on failure, pending and error states.',
  concepts: ['optimistic updates', 'async state machine', 'rollback', 'aria-pressed', 'race conditions'],
  companies: ['Meta', 'Twitter', 'LinkedIn', 'ShareChat'],
  prerequisites: ['j01-todo-list'],
  frequency: 'common',
};

export default meta;
