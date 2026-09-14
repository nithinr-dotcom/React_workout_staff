import type { TaskMeta } from '../../../lib/types';

const meta: TaskMeta = {
  id: 's55-email-client',
  code: 'S55',
  title: 'Email Client (3-pane)',
  level: 'senior',
  order: 55,
  kind: 'app',
  minutes: 90,
  summary: 'Outlook-style folders, message list and reading pane with Gmail-style keyboard triage, multi-select bulk archive, search and derived unread counts.',
  concepts: [
    'useReducer for domain state',
    'derived state (counts, filtered lists)',
    'roving tabindex',
    'focus management after removal',
    'keyboard shortcuts',
    'multi-select',
  ],
  companies: ['Microsoft'],
  prerequisites: ['j02-accordion', 's08-data-table'],
  frequency: 'occasional',
};

export default meta;
