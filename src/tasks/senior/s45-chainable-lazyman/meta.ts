import type { TaskMeta } from '../../../lib/types';

const meta: TaskMeta = {
  id: 's45-chainable-lazyman',
  code: 'S45',
  title: 'Chainable APIs: LazyMan & fluent query builder',
  level: 'senior',
  order: 45,
  kind: 'js',
  minutes: 70,
  summary: 'LazyMan with a deferred task queue and sleepFirst, then an immutable, thenable fetch client builder with query, headers and retries.',
  concepts: ['method chaining', 'deferred task queues', 'immutable builders', 'thenables', 'retry policies', 'dependency injection'],
  companies: ['Atlassian'],
  prerequisites: ['s26-promise-combinators'],
  frequency: 'common',
};

export default meta;
