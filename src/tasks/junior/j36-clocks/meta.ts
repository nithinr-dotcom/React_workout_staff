import type { TaskMeta } from '../../../lib/types';

const meta: TaskMeta = {
  id: 'j36-clocks',
  code: 'J36',
  title: 'Digital & Analog Clock',
  level: 'junior',
  order: 36,
  kind: 'ui',
  minutes: 40,
  summary: 'A ticking clock with a 12h/24h digital mode and an analog mode with rotating hands, aligned to real second boundaries.',
  concepts: ['timers aligned to the wall clock', 'effect cleanup', 'injected clock for testing', 'angle maths', 'CSS transforms', '<time> semantics'],
  companies: [],
  prerequisites: ['j07-stopwatch-countdown'],
  frequency: 'common',
};

export default meta;
