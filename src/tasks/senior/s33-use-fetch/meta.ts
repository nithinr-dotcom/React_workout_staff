import type { TaskMeta } from '../../../lib/types';

const meta: TaskMeta = {
  id: 's33-use-fetch',
  code: 'S33',
  title: 'useFetch with abort + cache',
  level: 'senior',
  order: 33,
  kind: 'hook',
  minutes: 60,
  summary: 'A data-fetching hook with AbortController, stale-response guarding, a shared stale-while-revalidate cache and in-flight de-duplication.',
  concepts: [
    'custom hooks',
    'AbortController',
    'race conditions',
    'stale-while-revalidate',
    'request de-duplication',
    'reference counting',
    'module-level cache',
    'latest-ref pattern',
    'renderHook testing',
  ],
  companies: ['Meta', 'Atlassian', 'Razorpay', 'Swiggy'],
  prerequisites: ['j25-hooks-pack', 's26-promise-combinators', 's32-retry-backoff'],
  frequency: 'very-common',
};

export default meta;
