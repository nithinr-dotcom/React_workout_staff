import type { TaskMeta } from '../../../lib/types';

const meta: TaskMeta = {
  id: 's51-calendar-week-view',
  code: 'S51',
  title: 'Calendar Day/Week View with Overlapping Events',
  level: 'senior',
  order: 51,
  kind: 'ui',
  minutes: 90,
  summary: 'A Google-Calendar-style week grid: a pure layOutDay algorithm for colliding events, a time gutter, a now line and accessible event buttons.',
  concepts: [
    'interval overlap / sweep line',
    'greedy column packing',
    'connected components (collision clusters)',
    'pure layout function + thin component',
    'Date arithmetic in local time',
    'absolute positioning in a scroll container',
    'injected clock',
  ],
  companies: [],
  prerequisites: ['s14-date-picker'],
  frequency: 'common',
};

export default meta;
