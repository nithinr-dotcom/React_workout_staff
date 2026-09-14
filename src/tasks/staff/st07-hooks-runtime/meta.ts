import type { TaskMeta } from '../../../lib/types';

const meta: TaskMeta = {
  id: 'st07-hooks-runtime',
  code: 'ST07',
  title: 'Hooks from scratch',
  level: 'staff',
  order: 7,
  kind: 'js',
  minutes: 90,
  summary: 'Implement a tiny component runtime with useState, useEffect, useMemo and useRef: hook slots, batched updates and effect cleanup.',
  concepts: [
    'hook slots by call order',
    'closures',
    'microtask batching',
    'effect dependency comparison',
    'effect cleanup ordering',
    'rules of hooks',
  ],
  companies: ['Meta', 'Google', 'Atlassian'],
  prerequisites: ['j25-hooks-pack'],
  frequency: 'occasional',
};

export default meta;
