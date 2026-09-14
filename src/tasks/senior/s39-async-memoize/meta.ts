import type { TaskMeta } from '../../../lib/types';

const meta: TaskMeta = {
  id: 's39-async-memoize',
  code: 'S39',
  title: 'Async memoize with in-flight dedupe',
  level: 'senior',
  order: 39,
  kind: 'js',
  minutes: 60,
  summary: 'memoizeAsync for promise-returning functions: shared in-flight calls, order-insensitive keys, TTL from fulfilment, delete and clear.',
  concepts: [
    'promise caching',
    'in-flight request dedupe',
    'stable cache keys',
    'TTL with an injected clock',
    'race conditions on invalidation',
  ],
  companies: ['Uber', 'Rippling', 'Microsoft', 'Atlassian'],
  prerequisites: ['s31-memoize-lru'],
  frequency: 'common',
};

export default meta;
