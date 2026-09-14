import type { TaskMeta } from '../../../lib/types';

const meta: TaskMeta = {
  id: 's01-modal-dialog',
  code: 'S01',
  title: 'Modal Dialog',
  level: 'senior',
  order: 1,
  kind: 'ui',
  minutes: 60,
  summary: 'An accessible modal: portal, focus trap, Escape and backdrop close, scroll lock and focus restore.',
  concepts: ['portals', 'focus management', 'focus trap', 'ARIA dialog pattern', 'effects cleanup', 'scroll lock', 'refs'],
  companies: ['Razorpay', 'Atlassian', 'Flipkart'],
  prerequisites: ['j02-accordion', 'j25-hooks-pack'],
  frequency: 'common',
};

export default meta;
