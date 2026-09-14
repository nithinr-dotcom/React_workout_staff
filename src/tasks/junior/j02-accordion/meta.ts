import type { TaskMeta } from '../../../lib/types';

const meta: TaskMeta = {
  id: 'j02-accordion',
  code: 'J02',
  title: 'Accordion',
  level: 'junior',
  order: 2,
  kind: 'ui',
  minutes: 35,
  summary: 'Collapsible sections with single/multiple open modes and full keyboard support.',
  concepts: ['controlled state', 'derived state', 'ARIA accordion pattern', 'keyboard navigation', 'refs'],
  companies: ['Rippling', 'Atlassian', 'Flipkart'],
  prerequisites: ['j01-todo-list'],
  frequency: 'very-common',
  star: true,
};

export default meta;
