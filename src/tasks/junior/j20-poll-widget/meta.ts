import type { TaskMeta } from '../../../lib/types';

const meta: TaskMeta = {
  id: 'j20-poll-widget',
  code: 'J20',
  title: 'Poll Widget',
  level: 'junior',
  order: 20,
  kind: 'ui',
  minutes: 35,
  summary: 'Vote once on a poll, see results with percentages, change your vote, and remember it across reloads.',
  concepts: ['derived counts', 'radio groups', 'localStorage persistence', 'percentage rounding', 'view switching'],
  companies: [],
  prerequisites: ['j01-todo-list'],
  frequency: 'occasional',
};

export default meta;
