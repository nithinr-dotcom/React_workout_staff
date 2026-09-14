import type { TaskMeta } from '../../../lib/types';

const meta: TaskMeta = {
  id: 'j19-form-wizard',
  code: 'J19',
  title: 'Multi-step Form Wizard',
  level: 'junior',
  order: 19,
  kind: 'ui',
  minutes: 45,
  summary: 'A three-step signup wizard with per-step validation, Back that keeps data, a step indicator and async submit.',
  concepts: ['lifting form state', 'per-step validation', 'focus management', 'aria-current="step"', 'async submit states'],
  companies: [],
  prerequisites: ['j05-signup-form'],
  frequency: 'common',
};

export default meta;
