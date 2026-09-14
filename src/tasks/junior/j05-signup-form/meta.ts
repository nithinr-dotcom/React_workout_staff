import type { TaskMeta } from '../../../lib/types';

const meta: TaskMeta = {
  id: 'j05-signup-form',
  code: 'J05',
  title: 'Signup Form with Validation',
  level: 'junior',
  order: 5,
  kind: 'ui',
  minutes: 40,
  summary: 'A signup form with blur/submit validation, accessible error messages and an async submit with success and server-error states.',
  concepts: ['controlled forms', 'validation timing', 'aria-invalid / aria-describedby', 'async submit state', 'focus management'],
  companies: ['Flipkart', 'Razorpay', 'PhonePe', 'Atlassian'],
  prerequisites: ['j01-todo-list'],
  frequency: 'very-common',
};

export default meta;
