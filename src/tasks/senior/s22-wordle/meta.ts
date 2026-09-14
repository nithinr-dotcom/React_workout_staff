import type { TaskMeta } from '../../../lib/types';

const meta: TaskMeta = {
  id: 's22-wordle',
  code: 'S22',
  title: 'Wordle',
  level: 'senior',
  order: 22,
  kind: 'game',
  minutes: 60,
  summary: 'A 6×5 Wordle with physical and on-screen keyboards, word-list validation and a correct duplicate-letter scoring algorithm.',
  concepts: [
    'pure scoring function',
    'duplicate-letter counting',
    'global keydown listeners',
    'derived state',
    'status precedence',
    'accessible names for visual state',
  ],
  companies: [],
  prerequisites: ['j14-tic-tac-toe', 'j15-memory-game'],
  frequency: 'common',
};

export default meta;
