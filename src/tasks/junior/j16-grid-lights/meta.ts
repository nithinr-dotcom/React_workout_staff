import type { TaskMeta } from '../../../lib/types';

const meta: TaskMeta = {
  id: 'j16-grid-lights',
  code: 'J16',
  title: 'Grid Lights',
  level: 'junior',
  order: 16,
  kind: 'game',
  minutes: 35,
  summary: 'Activate cells in a configurable grid; once all are on, they switch off one by one in reverse order.',
  concepts: ['activation order as a stack', 'setInterval/setTimeout cleanup', 'disabled states', 'config-driven rendering', 'aria-pressed'],
  companies: ['Uber'],
  prerequisites: ['j06-traffic-light'],
  frequency: 'common',
};

export default meta;
