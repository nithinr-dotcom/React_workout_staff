import type { TaskMeta } from '../../../lib/types';

const meta: TaskMeta = {
  id: 's53-snakes-and-ladders',
  code: 'S53',
  title: 'Snakes & Ladders',
  level: 'senior',
  order: 53,
  kind: 'game',
  minutes: 60,
  summary: 'A 2–4 player Snakes & Ladders with a boustrophedon board, a pure applyMove reducer, injected dice and live move announcements.',
  concepts: [
    'pure state transitions',
    'boustrophedon grid mapping',
    'injected randomness',
    'turn rules',
    'live regions',
    'immutable updates',
  ],
  companies: [],
  prerequisites: ['s23-connect-four'],
  frequency: 'common',
};

export default meta;
