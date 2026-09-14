import type { TaskMeta } from '../../../lib/types';

const meta: TaskMeta = {
  id: 's30-curry-pipe-compose',
  code: 'S30',
  title: 'curry, pipe & compose',
  level: 'senior',
  order: 30,
  kind: 'js',
  minutes: 45,
  summary: 'Implement curry by arity with multi-argument calls and placeholders, plus pipe, compose and an async pipe.',
  concepts: ['closures', 'function arity', 'partial application', 'higher-order functions', 'reduce', 'promise chaining'],
  companies: ['Meta', 'Razorpay'],
  prerequisites: ['j23-debounce'],
  frequency: 'common',
};

export default meta;
