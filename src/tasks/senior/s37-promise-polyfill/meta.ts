import type { TaskMeta } from '../../../lib/types';

const meta: TaskMeta = {
  id: 's37-promise-polyfill',
  code: 'S37',
  title: 'Promise from scratch',
  level: 'senior',
  order: 37,
  kind: 'js',
  minutes: 75,
  summary: 'Build MyPromise: executor, microtask-scheduled then/catch/finally, chaining, thenable adoption and the self-resolution TypeError.',
  concepts: [
    'promise state machine',
    'microtasks (queueMicrotask)',
    'promise resolution procedure',
    'thenables',
    'classes & private state',
    'error propagation through chains',
  ],
  companies: ['Dream11', 'Airbnb', 'Google', 'Amazon', 'LinkedIn', 'Flipkart', 'Walmart'],
  prerequisites: ['s26-promise-combinators'],
  frequency: 'very-common',
};

export default meta;
