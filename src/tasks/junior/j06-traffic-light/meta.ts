import type { TaskMeta } from '../../../lib/types';

const meta: TaskMeta = {
  id: 'j06-traffic-light',
  code: 'J06',
  title: 'Traffic Light',
  level: 'junior',
  order: 6,
  kind: 'ui',
  minutes: 30,
  summary: 'A traffic light that cycles red → green → yellow using configurable durations and a cleaned-up setTimeout chain.',
  concepts: ['useEffect cleanup', 'setTimeout chains', 'state machines', 'config-driven UI', 'fake timers in tests'],
  companies: ['Uber', 'Amazon', 'Walmart'],
  prerequisites: [],
  frequency: 'common',
};

export default meta;
