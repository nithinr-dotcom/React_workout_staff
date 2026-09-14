import type { TaskMeta } from '../../../lib/types';

const meta: TaskMeta = {
  id: 's23-connect-four',
  code: 'S23',
  title: 'Connect Four',
  level: 'senior',
  order: 23,
  kind: 'game',
  minutes: 45,
  summary: 'A 6×7 Connect Four with gravity drops, win detection in all four directions, draws and an accessible board.',
  concepts: ['2D grid modelling', 'immutable updates', 'directional win scanning', 'derived game status', 'pure game logic', 'accessible names'],
  companies: ['Airbnb', 'Uber'],
  prerequisites: ['j14-tic-tac-toe'],
  frequency: 'common',
};

export default meta;
