import type { TaskMeta } from '../../../lib/types';

const meta: TaskMeta = {
  id: 's41-rate-limiter',
  code: 'S41',
  title: 'Rate limiter & hit counter',
  level: 'senior',
  order: 41,
  kind: 'js',
  minutes: 70,
  summary: 'A rolling-window hit counter with bounded memory, then a sliding-window-log rate limiter with tryAcquire and a reject-or-queue wrap.',
  concepts: ['sliding windows', 'deques / ring buffers', 'amortised O(1)', 'injected clocks', 'promise queues', 'token bucket'],
  companies: ['Uber', 'Dropbox'],
  prerequisites: ['j24-throttle', 's27-concurrency-runner'],
  frequency: 'common',
};

export default meta;
