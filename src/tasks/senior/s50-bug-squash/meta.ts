import type { TaskMeta } from '../../../lib/types';

const meta: TaskMeta = {
  id: 's50-bug-squash',
  code: 'S50',
  title: 'Bug Squash: fix a broken React app',
  level: 'senior',
  order: 50,
  kind: 'app',
  minutes: 60,
  summary: 'Debug an existing Team Directory app: reproduce seven QA tickets, find each root cause and fix it without a rewrite.',
  concepts: [
    'debugging an unfamiliar codebase',
    'stale closures',
    'effect dependencies',
    'async race conditions',
    'keys and component identity',
    'immutable state updates',
    'derived state',
    'effect cleanup',
  ],
  companies: ['Stripe', 'Intuit', 'Atlassian'],
  prerequisites: ['s21-users-directory', 's33-use-fetch', 'j23-debounce'],
  frequency: 'common',
};

export default meta;
