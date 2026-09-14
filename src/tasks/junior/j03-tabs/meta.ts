import type { TaskMeta } from '../../../lib/types';

const meta: TaskMeta = {
  id: 'j03-tabs',
  code: 'J03',
  title: 'Tabs',
  level: 'junior',
  order: 3,
  kind: 'ui',
  minutes: 35,
  summary: 'Accessible tabs with roving tabindex, arrow-key navigation and automatic activation.',
  concepts: ['ARIA tabs pattern', 'roving tabindex', 'keyboard navigation', 'useId', 'refs to lists of elements'],
  companies: ['Atlassian', 'Microsoft', 'Flipkart'],
  prerequisites: ['j02-accordion'],
  frequency: 'very-common',
  star: true,
};

export default meta;
