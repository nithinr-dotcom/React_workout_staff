import type { TaskMeta } from '../../../lib/types';

const meta: TaskMeta = {
  id: 'st03-data-grid-10k',
  code: 'ST03',
  title: '10k-row Data Grid',
  level: 'staff',
  order: 3,
  kind: 'design',
  minutes: 120,
  summary: 'Render 10,000 × 20 cells smoothly: row and column virtualization, sticky header and first column, non-blocking sort, ARIA grid keyboard navigation.',
  concepts: [
    'row + column virtualization',
    'sticky positioning',
    'scroll performance',
    'useTransition / Web Workers',
    'ARIA grid pattern',
    'roving tabindex',
    'performance budgets',
  ],
  companies: ['Atlassian', 'Rippling', 'Datadog', 'Airtable', 'Microsoft'],
  prerequisites: [],
  frequency: 'common',
};

export default meta;
