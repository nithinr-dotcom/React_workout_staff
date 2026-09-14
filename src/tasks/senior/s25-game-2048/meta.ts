import type { TaskMeta } from '../../../lib/types';

const meta: TaskMeta = {
  id: 's25-game-2048',
  code: 'S25',
  title: '2048',
  level: 'senior',
  order: 25,
  kind: 'game',
  minutes: 60,
  summary: 'The 2048 sliding-tile game: a pure move function with merge-once rules, seeded tile spawning, score, win and game-over detection.',
  concepts: ['pure move function', 'matrix rotation / reuse', 'merge-once rules', 'injectable randomness', 'global key listeners', 'derived game status'],
  companies: ['Rippling'],
  prerequisites: ['j14-tic-tac-toe', 'j16-grid-lights'],
  frequency: 'common',
};

export default meta;
