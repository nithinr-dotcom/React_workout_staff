import type { TaskMeta } from '../../../lib/types';

const meta: TaskMeta = {
  id: 'j22-job-board',
  code: 'J22',
  title: 'Job Board (load more)',
  level: 'junior',
  order: 22,
  kind: 'app',
  minutes: 45,
  summary: 'A Hacker-News-style job board: fetch ids, then load job details in parallel pages of 6 with a "Load more" button.',
  concepts: ['Promise.all', 'pagination', 'loading and error states', 'effects and cleanup', 'derived state', 'date formatting'],
  companies: ['Rippling', 'GreatFrontEnd', 'Atlassian'],
  prerequisites: ['j21-dictionary-search'],
  frequency: 'common',
};

export default meta;
