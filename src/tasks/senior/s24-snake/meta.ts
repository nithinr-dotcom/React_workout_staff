import type { TaskMeta } from '../../../lib/types';

const meta: TaskMeta = {
  id: 's24-snake',
  code: 'S24',
  title: 'Snake',
  level: 'senior',
  order: 24,
  kind: 'game',
  minutes: 60,
  summary: 'Classic Snake on a grid: a tick loop driving a pure step function, buffered turns, growth, collisions, pause and injectable randomness.',
  concepts: ['game loop with timers', 'pure reducer-style step function', 'input buffering', 'stale closures & refs', 'global key listeners', 'injectable randomness'],
  companies: [],
  prerequisites: ['j07-stopwatch-countdown', 'j16-grid-lights'],
  frequency: 'occasional',
};

export default meta;
