import type { TaskMeta } from '../../../lib/types';

const meta: TaskMeta = {
  id: 's16-bar-chart',
  code: 'S16',
  title: 'Interactive Bar Chart',
  level: 'senior',
  order: 16,
  kind: 'ui',
  minutes: 75,
  summary: 'Hand-built SVG bar chart with nice axis ticks, hover/focus tooltips, keyboard navigation and a sort toggle.',
  concepts: [
    'SVG coordinate systems & viewBox',
    'linear scales and nice ticks',
    'accessible charts',
    'tooltip positioning',
    'roving focus',
    'derived sorted data',
  ],
  companies: ['Atlassian'],
  prerequisites: [],
  frequency: 'occasional',
};

export default meta;
