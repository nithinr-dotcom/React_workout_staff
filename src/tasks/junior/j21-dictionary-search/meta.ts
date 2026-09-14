import type { TaskMeta } from '../../../lib/types';

const meta: TaskMeta = {
  id: 'j21-dictionary-search',
  code: 'J21',
  title: 'Dictionary Search',
  level: 'junior',
  order: 21,
  kind: 'app',
  minutes: 40,
  summary: 'A word lookup app against a mock API: loading, not-found and error states, retry, and ignoring stale responses.',
  concepts: ['data fetching in effects/handlers', 'AbortController', 'race conditions', 'async UI states', 'forms', 'error handling'],
  companies: ['Swiggy', 'Flipkart', 'Atlassian'],
  prerequisites: ['j05-signup-form'],
  frequency: 'common',
};

export default meta;
