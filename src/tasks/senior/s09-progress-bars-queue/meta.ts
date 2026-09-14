import type { TaskMeta } from '../../../lib/types';

const meta: TaskMeta = {
  id: 's09-progress-bars-queue',
  code: 'S09',
  title: 'Progress Bars Queue',
  level: 'senior',
  order: 9,
  kind: 'ui',
  minutes: 60,
  summary: 'Add progress bars that fill over time with a concurrency limit, a FIFO queue, and pause/resume for all.',
  concepts: [
    'timers in React',
    'concurrency limiting',
    'derived queue state',
    'useReducer',
    'effect cleanup',
    'elapsed-time accounting',
    'fake timers in tests',
  ],
  companies: ['Uber', 'Google', 'Meta', 'Atlassian'],
  prerequisites: ['j23-debounce', 'j25-hooks-pack'],
  frequency: 'very-common',
  star: true,
};

export default meta;
