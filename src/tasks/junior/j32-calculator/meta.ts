import type { TaskMeta } from '../../../lib/types';

const meta: TaskMeta = {
  id: 'j32-calculator',
  code: 'J32',
  title: 'Calculator',
  level: 'junior',
  order: 32,
  kind: 'app',
  minutes: 45,
  summary: 'A pocket calculator with a keypad, chained operations, repeated equals, error states and keyboard input, without eval.',
  concepts: ['state machine modelling', 'event handling', 'global keyboard listeners', 'floating-point display', 'accessible names'],
  companies: [],
  prerequisites: ['j17-mortgage-calculator'],
  frequency: 'common',
};

export default meta;
