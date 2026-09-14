import type { TaskMeta } from '../../../lib/types';

const meta: TaskMeta = {
  id: 's40-request-batcher',
  code: 'S40',
  title: 'Request batcher / DataLoader',
  level: 'senior',
  order: 40,
  kind: 'js',
  minutes: 60,
  summary: 'createBatcher: coalesce load(key) calls into one batch request, flush on size or timer, dedupe keys and map results back per key.',
  concepts: ['request batching', 'timers', 'promise fan-out', 'per-key error handling', 'DataLoader pattern'],
  companies: ['Uber'],
  prerequisites: ['s26-promise-combinators', 's27-concurrency-runner'],
  frequency: 'common',
};

export default meta;
