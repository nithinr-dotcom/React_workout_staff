import type { TaskMeta } from '../../../lib/types';

const meta: TaskMeta = {
  id: 's08-data-table',
  code: 'S08',
  title: 'Data Table: sort, filter, paginate',
  level: 'senior',
  order: 8,
  kind: 'ui',
  minutes: 75,
  summary: 'A generic, column-configured table with tri-state sorting, search, a select filter and client-side pagination.',
  concepts: [
    'generic components',
    'derived state with useMemo',
    'config-driven rendering',
    'stable sorting',
    'aria-sort',
    'resetting state on input change',
  ],
  companies: ['Rippling', 'Swiggy', 'Atlassian', 'Flipkart'],
  prerequisites: ['j11-pagination', 'j25-hooks-pack'],
  frequency: 'very-common',
  star: true,
};

export default meta;
