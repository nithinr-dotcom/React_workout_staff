import type { TaskMeta } from '../../../lib/types';

const meta: TaskMeta = {
  id: 'j39-quiz-app',
  code: 'J39',
  title: 'Quiz App',
  level: 'junior',
  order: 39,
  kind: 'app',
  minutes: 40,
  summary: 'A one-question-at-a-time quiz with radio options, progress, an optional per-question timer and a scored review screen.',
  concepts: ['multi-step state', 'radio groups', 'derived score', 'timers with reset and cleanup', 'focus management'],
  companies: [],
  prerequisites: ['j19-form-wizard'],
  frequency: 'occasional',
};

export default meta;
