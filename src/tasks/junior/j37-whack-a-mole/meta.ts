import type { TaskMeta } from '../../../lib/types';

const meta: TaskMeta = {
  id: 'j37-whack-a-mole',
  code: 'J37',
  title: 'Whack-a-Mole',
  level: 'junior',
  order: 37,
  kind: 'game',
  minutes: 40,
  summary: 'A timed 3×3 Whack-a-Mole game with random pop-ups, scoring, a countdown and a game-over screen.',
  concepts: ['game state machine', 'intervals and timeouts with cleanup', 'stale closures', 'injected randomness', 'accessible names'],
  companies: [],
  prerequisites: ['j15-memory-game', 'j07-stopwatch-countdown'],
  frequency: 'common',
};

export default meta;
