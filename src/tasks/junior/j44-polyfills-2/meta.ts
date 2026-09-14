import type { TaskMeta } from '../../../lib/types';

const meta: TaskMeta = {
  id: 'j44-polyfills-2',
  code: 'J44',
  title: 'Polyfills II: new, instanceof, Object.create, Object.assign, Array.prototype.flat',
  level: 'junior',
  order: 44,
  kind: 'js',
  minutes: 40,
  summary:
    'Re-implement the new operator, instanceof, Object.create, Object.assign and Array.prototype.flat as standalone functions, matching the spec edge cases.',
  concepts: ['prototype chain', 'the new operator', 'property descriptors', 'symbols', 'getters and setters', 'sparse arrays', 'TypeError semantics'],
  companies: [],
  prerequisites: ['j27-polyfills'],
  frequency: 'common',
};

export default meta;
