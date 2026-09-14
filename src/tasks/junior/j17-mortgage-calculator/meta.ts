import type { TaskMeta } from '../../../lib/types';

const meta: TaskMeta = {
  id: 'j17-mortgage-calculator',
  code: 'J17',
  title: 'Mortgage Calculator',
  level: 'junior',
  order: 17,
  kind: 'app',
  minutes: 35,
  summary: 'A loan form that validates inputs and shows the monthly payment, total payment and total interest in local currency.',
  concepts: ['controlled form inputs', 'validation', 'derived values', 'Intl.NumberFormat', 'aria-describedby errors'],
  companies: ['Razorpay'],
  prerequisites: ['j05-signup-form'],
  frequency: 'common',
};

export default meta;
