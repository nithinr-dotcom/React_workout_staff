import type { TaskMeta } from '../../../lib/types';

const meta: TaskMeta = {
  id: 'j43-flight-booker',
  code: 'J43',
  title: 'Flight Booker',
  level: 'junior',
  order: 43,
  kind: 'ui',
  minutes: 35,
  summary: 'The 7GUIs flight booker: one-way or return, date validation against an injected today, and accessible inline errors.',
  concepts: ['controlled select and date inputs', 'derived validation', 'disabled states', 'aria-describedby errors', 'YYYY-MM-DD date handling'],
  companies: [],
  prerequisites: ['j05-signup-form'],
  frequency: 'occasional',
};

export default meta;
