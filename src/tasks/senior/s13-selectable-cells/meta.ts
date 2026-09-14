import type { TaskMeta } from '../../../lib/types';

const meta: TaskMeta = {
  id: 's13-selectable-cells',
  code: 'S13',
  title: 'Selectable Cells',
  level: 'senior',
  order: 13,
  kind: 'ui',
  minutes: 60,
  summary: 'A grid where click-and-drag selects a rectangle of cells, with a live preview and commit on mouse up.',
  concepts: [
    'mouse/pointer event lifecycle',
    'document-level listeners',
    'transient vs committed state',
    'rectangle normalisation',
    'ARIA grid + aria-selected',
    'render performance for many cells',
  ],
  companies: [],
  prerequisites: [],
  frequency: 'common',
};

export default meta;
