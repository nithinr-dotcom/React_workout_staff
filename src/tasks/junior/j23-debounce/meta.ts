import type { TaskMeta } from '../../../lib/types';

const meta: TaskMeta = {
  id: 'j23-debounce',
  code: 'J23',
  title: 'debounce(fn, wait) with cancel & flush',
  level: 'junior',
  order: 23,
  kind: 'js',
  minutes: 30,
  summary: 'Implement debounce from scratch: trailing call, `this`/args forwarding, cancel, flush, pending.',
  concepts: ['closures', 'timers', 'this binding', 'function wrappers', 'fake timers in tests'],
  companies: ['Google', 'Airbnb', 'Uber', 'Atlassian', 'Flipkart', 'Meta'],
  prerequisites: [],
  frequency: 'very-common',
  star: true,
};

export default meta;
