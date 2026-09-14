import type { TaskMeta } from '../../../lib/types';

const meta: TaskMeta = {
  id: 's07-nested-checkboxes',
  code: 'S07',
  title: 'Nested Checkboxes',
  level: 'senior',
  order: 7,
  kind: 'ui',
  minutes: 60,
  summary: 'A tree of checkboxes where parents select their subtree and reflect children as checked or indeterminate.',
  concepts: ['recursive components', 'derived state', 'tree traversal', 'indeterminate via refs', 'single source of truth'],
  companies: ['Rippling', 'Atlassian', 'Flipkart'],
  prerequisites: ['j02-accordion', 's05-file-explorer'],
  frequency: 'common',
};

export default meta;
