import type { TaskMeta } from '../../../lib/types';

const meta: TaskMeta = {
  id: 's31-memoize-lru',
  code: 'S31',
  title: 'memoize & LRU cache',
  level: 'senior',
  order: 31,
  kind: 'js',
  minutes: 60,
  summary: 'Build an O(1) LRU cache on Map ordering, then a memoize with resolver, maxSize, TTL and in-flight promise dedupe.',
  concepts: ['Map insertion order', 'LRU eviction', 'cache keys', 'TTL', 'promise memoization', 'classes & getters'],
  companies: [],
  prerequisites: ['s26-promise-combinators'],
  frequency: 'common',
};

export default meta;
