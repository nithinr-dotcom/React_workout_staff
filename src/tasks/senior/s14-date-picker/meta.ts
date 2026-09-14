import type { TaskMeta } from '../../../lib/types';

const meta: TaskMeta = {
  id: 's14-date-picker',
  code: 'S14',
  title: 'Date Picker',
  level: 'senior',
  order: 14,
  kind: 'ui',
  minutes: 90,
  summary: 'Input plus calendar dialog with a month grid, min/max, and the full APG date-picker keyboard model. No date libraries.',
  concepts: [
    'Date arithmetic without libraries',
    'ISO date strings and time zones',
    'ARIA date picker dialog + grid',
    'roving tabindex',
    'focus management',
    'Intl.DateTimeFormat',
  ],
  companies: [],
  prerequisites: ['s01-modal-dialog', 'j03-tabs'],
  frequency: 'common',
};

export default meta;
