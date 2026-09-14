import type { TaskMeta } from '../../../lib/types';

const meta: TaskMeta = {
  id: 'j10-progress-bar',
  code: 'J10',
  title: 'Progress Bar',
  level: 'junior',
  order: 10,
  kind: 'ui',
  minutes: 30,
  summary: 'An accessible, animated progress bar with clamping, a visible label and an indeterminate follow-up.',
  concepts: ['ARIA progressbar', 'clamping & derived values', 'CSS transitions', 'transform vs width', 'prefers-reduced-motion'],
  companies: ['GreatFrontEnd', 'Uber', 'Dropbox'],
  prerequisites: [],
  frequency: 'common',
};

export default meta;
