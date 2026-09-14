import type { TaskMeta } from '../../../lib/types';

const meta: TaskMeta = {
  id: 'j24-throttle',
  code: 'J24',
  title: 'throttle(fn, wait) with leading/trailing',
  level: 'junior',
  order: 24,
  kind: 'js',
  minutes: 30,
  summary: 'Implement throttle from scratch: leading and trailing edges, latest-args trailing call, `this` forwarding, cancel.',
  concepts: ['closures', 'timers', 'this binding', 'rate limiting', 'fake timers in tests'],
  companies: ['Google', 'Uber', 'Atlassian', 'Flipkart', 'Meta'],
  prerequisites: ['j23-debounce'],
  frequency: 'very-common',
};

export default meta;
