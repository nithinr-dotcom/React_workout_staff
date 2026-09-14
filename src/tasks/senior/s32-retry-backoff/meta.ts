import type { TaskMeta } from '../../../lib/types';

const meta: TaskMeta = {
  id: 's32-retry-backoff',
  code: 'S32',
  title: 'retry with backoff & cancellable timeout',
  level: 'senior',
  order: 32,
  kind: 'js',
  minutes: 60,
  summary: 'Write abortable sleep and withTimeout, then a retry helper with exponential backoff, jitter, shouldRetry and AbortSignal.',
  concepts: ['AbortController & AbortSignal', 'exponential backoff', 'jitter', 'promise races', 'timer cleanup', 'fake timers with async code'],
  companies: [],
  prerequisites: ['j23-debounce', 's26-promise-combinators'],
  frequency: 'common',
};

export default meta;
