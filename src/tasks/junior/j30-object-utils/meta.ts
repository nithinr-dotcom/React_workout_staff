import type { TaskMeta } from '../../../lib/types';

const meta: TaskMeta = {
  id: 'j30-object-utils',
  code: 'J30',
  title: 'groupBy, chunk, deepMerge, deepOmit & squashObject',
  level: 'junior',
  order: 30,
  kind: 'js',
  minutes: 40,
  summary:
    'Five lodash-style data utilities: groupBy, chunk, a non-mutating deepMerge, a recursive deepOmit, and squashObject with its inverse.',
  concepts: ['recursion', 'plain-object detection', 'immutability', 'prototype-safe dictionaries', 'path strings', 'array vs object containers'],
  companies: ['Meesho'],
  prerequisites: ['j26-flatten-get-classnames'],
  frequency: 'very-common',
};

export default meta;
