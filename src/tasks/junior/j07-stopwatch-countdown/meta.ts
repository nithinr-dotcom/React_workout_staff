import type { TaskMeta } from '../../../lib/types';

const meta: TaskMeta = {
  id: 'j07-stopwatch-countdown',
  code: 'J07',
  title: 'Stopwatch & Countdown',
  level: 'junior',
  order: 7,
  kind: 'ui',
  minutes: 45,
  summary: 'A drift-free stopwatch with laps and a countdown timer with pause, reset and a completion callback.',
  concepts: ['drift-free timing', 'intervals and cleanup', 'refs for mutable values', 'derived display state', 'time formatting'],
  companies: ['Microsoft', 'Uber', 'Swiggy'],
  prerequisites: ['j06-traffic-light'],
  frequency: 'common',
};

export default meta;
