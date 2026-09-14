import type { TaskMeta } from '../../../lib/types';

const meta: TaskMeta = {
  id: 's21-users-directory',
  code: 'S21',
  title: 'Users Directory CRUD',
  level: 'senior',
  order: 21,
  kind: 'app',
  minutes: 90,
  summary: 'Searchable, filterable users table with add/edit modal form, validation, and optimistic delete with rollback.',
  concepts: [
    'async loading / error / empty states',
    'derived (filtered) state',
    'form validation',
    'modal dialog focus management',
    'optimistic updates with rollback',
    'dependency injection for testability',
  ],
  companies: ['Rippling', 'Atlassian', 'Intuit', 'Razorpay'],
  prerequisites: ['s01-modal-dialog', 's08-data-table', 's10-toast-system'],
  frequency: 'very-common',
};

export default meta;
