import type { TaskMeta } from '../../../lib/types';

const meta: TaskMeta = {
  id: 'st02-popover-positioning',
  code: 'ST02',
  title: 'Popover / Tooltip positioning primitive',
  level: 'staff',
  order: 2,
  kind: 'design',
  minutes: 100,
  summary: 'A pure computePosition (placement, flip, shift), a usePopover hook on top of it, and an accessible Tooltip.',
  concepts: [
    'pure functions + thin hooks',
    'getBoundingClientRect',
    'useLayoutEffect',
    'collision detection',
    'ref callbacks',
    'portals & stacking contexts',
    'APG tooltip',
  ],
  companies: ['Atlassian', 'Figma', 'Microsoft', 'Airbnb'],
  prerequisites: [],
  frequency: 'common',
};

export default meta;
