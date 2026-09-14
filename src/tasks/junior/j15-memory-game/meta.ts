import type { TaskMeta } from '../../../lib/types';

const meta: TaskMeta = {
  id: 'j15-memory-game',
  code: 'J15',
  title: 'Memory Card Game',
  level: 'junior',
  order: 15,
  kind: 'game',
  minutes: 45,
  summary: 'Flip cards two at a time to find pairs: matching, timed flip-back, input locking, move counter and win state.',
  concepts: ['state machines', 'setTimeout with cleanup', 'input locking', 'dependency injection for randomness', 'derived state'],
  companies: [],
  prerequisites: ['j14-tic-tac-toe'],
  frequency: 'common',
};

export default meta;
