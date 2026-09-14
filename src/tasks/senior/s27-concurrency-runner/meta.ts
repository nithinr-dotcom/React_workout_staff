import type { TaskMeta } from '../../../lib/types';

const meta: TaskMeta = {
  id: 's27-concurrency-runner',
  code: 'S27',
  title: 'Concurrency-limited task runner',
  level: 'senior',
  order: 27,
  kind: 'js',
  minutes: 60,
  summary: 'Build mapAsyncLimit and a pausable promise queue with a concurrency cap, idle detection, priorities, retries and abort.',
  concepts: ['promises', 'concurrency control', 'queues', 'order preservation', 'AbortSignal', 'backpressure'],
  companies: ['Rippling', 'Uber', 'Atlassian', 'Google'],
  prerequisites: ['s26-promise-combinators'],
  frequency: 'very-common',
  star: true,
};

export default meta;
