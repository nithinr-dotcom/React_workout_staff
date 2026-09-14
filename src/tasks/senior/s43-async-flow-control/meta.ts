import type { TaskMeta } from '../../../lib/types';

const meta: TaskMeta = {
  id: 's43-async-flow-control',
  code: 'S43',
  title: 'Async flow: sequence, parallel, race & middleware pipeline',
  level: 'senior',
  order: 43,
  kind: 'js',
  minutes: 70,
  summary: 'Callback-style sequence/parallel/race, promises in sequence without async/await, and Koa-style middleware composition.',
  concepts: ['error-first callbacks', 'async control flow', 'reduce + then chains', 'promise factories', 'onion middleware', 'error propagation'],
  companies: ['Flipkart'],
  prerequisites: ['s26-promise-combinators', 's30-curry-pipe-compose'],
  frequency: 'common',
};

export default meta;
