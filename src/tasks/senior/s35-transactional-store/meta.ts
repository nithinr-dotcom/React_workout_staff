import type { TaskMeta } from '../../../lib/types';

const meta: TaskMeta = {
  id: 's35-transactional-store',
  code: 'S35',
  title: 'Transactional KV store',
  level: 'senior',
  order: 35,
  kind: 'js',
  minutes: 50,
  summary: 'An in-memory key-value store with O(1) value counts and nested begin/commit/rollback transactions.',
  concepts: [
    'data structure design',
    'undo logs vs copy-on-write layers',
    'nested transactions',
    'reverse index / counting map',
    'complexity analysis',
    'error semantics',
  ],
  companies: ['Rippling', 'Thumbtack', 'Stripe'],
  prerequisites: ['s28-event-emitter'],
  frequency: 'common',
};

export default meta;
