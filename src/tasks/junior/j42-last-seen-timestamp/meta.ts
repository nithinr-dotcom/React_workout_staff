import type { TaskMeta } from '../../../lib/types';

const meta: TaskMeta = {
  id: 'j42-last-seen-timestamp',
  code: 'J42',
  title: 'Last Seen / Relative Time',
  level: 'junior',
  order: 42,
  kind: 'ui',
  minutes: 40,
  summary: 'A pure formatLastSeen(date, now) plus a <LastSeen> component that re-renders on the right schedule, like WhatsApp.',
  concepts: [
    'pure formatting functions',
    'Date arithmetic and calendar days',
    'scheduling timers efficiently',
    'useEffect cleanup',
    'the <time> element',
    'fake timers',
  ],
  companies: ['Amazon'],
  prerequisites: ['j07-stopwatch-countdown'],
  frequency: 'occasional',
};

export default meta;
