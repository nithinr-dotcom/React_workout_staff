import type { TaskMeta } from '../../../lib/types';

const meta: TaskMeta = {
  id: 's12-sortable-list',
  code: 'S12',
  title: 'Sortable Drag & Drop List',
  level: 'senior',
  order: 12,
  kind: 'ui',
  minutes: 75,
  summary: 'Reorder a list by pointer drag and by keyboard (grab, move, drop, cancel) with screen-reader announcements.',
  concepts: [
    'HTML5 drag and drop / pointer events',
    'keyboard alternative to drag',
    'aria-live announcements',
    'focus preservation across reorders',
    'immutable array moves',
    'transient vs committed state',
  ],
  companies: [],
  prerequisites: ['j02-accordion'],
  frequency: 'common',
};

export default meta;
