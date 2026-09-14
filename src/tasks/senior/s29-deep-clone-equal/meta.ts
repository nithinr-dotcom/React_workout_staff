import type { TaskMeta } from '../../../lib/types';

const meta: TaskMeta = {
  id: 's29-deep-clone-equal',
  code: 'S29',
  title: 'deepClone & deepEqual',
  level: 'senior',
  order: 29,
  kind: 'js',
  minutes: 50,
  summary: 'Recursively clone and compare values: Date, RegExp, Map, Set, shared references and circular structures.',
  concepts: ['recursion', 'WeakMap', 'circular references', 'type checks', 'Map & Set', 'SameValueZero'],
  companies: ['Google'],
  prerequisites: [],
  frequency: 'common',
};

export default meta;
