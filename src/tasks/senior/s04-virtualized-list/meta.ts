import type { TaskMeta } from '../../../lib/types';

const meta: TaskMeta = {
  id: 's04-virtualized-list',
  code: 'S04',
  title: 'Virtualized List',
  level: 'senior',
  order: 4,
  kind: 'ui',
  minutes: 60,
  summary: 'Render 10,000 fixed-height rows smoothly by mounting only the visible window plus overscan.',
  concepts: ['windowing', 'scroll events', 'derived state', 'absolute positioning', 'render performance', 'memoization'],
  companies: ['Swiggy', 'Atlassian', 'Rippling'],
  prerequisites: ['j11-pagination', 'j25-hooks-pack'],
  frequency: 'common',
};

export default meta;
