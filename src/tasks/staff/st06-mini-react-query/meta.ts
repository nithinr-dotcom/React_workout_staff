import type { TaskMeta } from '../../../lib/types';

const meta: TaskMeta = {
  id: 'st06-mini-react-query',
  code: 'ST06',
  title: 'Mini React Query',
  level: 'staff',
  order: 6,
  kind: 'design',
  minutes: 110,
  summary: 'A server-state cache: useQuery with deduping, stale-while-revalidate, retries and garbage collection, plus useMutation and invalidation.',
  concepts: [
    'server state vs client state',
    'cache keys and stable hashing',
    'request deduplication',
    'stale-while-revalidate',
    'garbage collection',
    'retries with backoff',
    'useSyncExternalStore',
    'AbortController',
  ],
  companies: ['Atlassian', 'Uber', 'Airbnb', 'Razorpay'],
  prerequisites: ['st05-mini-redux'],
  frequency: 'common',
};

export default meta;
