import type { TaskMeta } from '../../../lib/types';

const meta: TaskMeta = {
  id: 's26-promise-combinators',
  code: 'S26',
  title: 'Promise.all / allSettled / any / race',
  level: 'senior',
  order: 26,
  kind: 'js',
  minutes: 50,
  summary: 'Re-implement the four Promise combinators with spec-accurate ordering, empty-input and rejection semantics.',
  concepts: ['promises', 'microtasks', 'iterables', 'AggregateError', 'thenables', 'fail-fast vs settle-all'],
  companies: ['Intuit', 'Meta', 'Google', 'Uber', 'Flipkart'],
  prerequisites: ['j23-debounce'],
  frequency: 'very-common',
  star: true,
};

export default meta;
