import type { TaskMeta } from '../../../lib/types';

const meta: TaskMeta = {
  id: 'st15-render-performance-audit',
  code: 'ST15',
  title: 'Render Performance Audit',
  level: 'staff',
  order: 15,
  kind: 'design',
  minutes: 90,
  summary: 'Profile a deliberately slow dashboard and fix it to hit render budgets: context splitting, state colocation, memo, stable props.',
  concepts: [
    'why components re-render',
    'state colocation',
    'context splitting and stable context values',
    'React.memo and referential stability',
    'useMemo for expensive derived data',
    'useDeferredValue / useTransition',
    'React Profiler and INP',
  ],
  companies: [],
  prerequisites: ['s04-virtualized-list', 's50-bug-squash'],
  frequency: 'common',
};

export default meta;
