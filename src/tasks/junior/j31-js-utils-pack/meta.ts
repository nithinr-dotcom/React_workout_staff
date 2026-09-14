import type { TaskMeta } from '../../../lib/types';

const meta: TaskMeta = {
  id: 'j31-js-utils-pack',
  code: 'J31',
  title: 'listFormat, once, shuffle & expiring storage',
  level: 'junior',
  order: 31,
  kind: 'js',
  minutes: 40,
  summary:
    'Four small utilities with sharp edges: human-readable list formatting, once/onlyTwice wrappers, an unbiased Fisher–Yates shuffle and localStorage with a TTL.',
  concepts: ['closures', 'string formatting', 'Fisher–Yates', 'testing randomness', 'dependency injection', 'localStorage', 'TTL expiry'],
  companies: ['Dream11'],
  prerequisites: [],
  frequency: 'common',
};

export default meta;
