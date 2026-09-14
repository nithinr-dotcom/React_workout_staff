import type { TaskMeta } from '../../../lib/types';

const meta: TaskMeta = {
  id: 's38-json-stringify-parse',
  code: 'S38',
  title: 'JSON.stringify & JSON.parse',
  level: 'senior',
  order: 38,
  kind: 'js',
  minutes: 80,
  summary: 'Re-implement JSON.stringify with native edge cases (toJSON, omission, escaping, cycles) and a recursive-descent JSON.parse.',
  concepts: [
    'recursion over object graphs',
    'cycle detection',
    'string escaping',
    'recursive-descent parsing',
    'SyntaxError reporting',
    'type checks (typeof, Array.isArray)',
  ],
  companies: ['Meta'],
  prerequisites: ['s29-deep-clone-equal'],
  frequency: 'common',
};

export default meta;
