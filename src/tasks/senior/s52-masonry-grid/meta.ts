import type { TaskMeta } from '../../../lib/types';

const meta: TaskMeta = {
  id: 's52-masonry-grid',
  code: 'S52',
  title: 'Masonry Photo Grid',
  level: 'senior',
  order: 52,
  kind: 'ui',
  minutes: 75,
  summary: 'A Pinterest-style grid: a pure shortest-column layout, responsive column count via ResizeObserver, no layout shift and infinite loading.',
  concepts: [
    'shortest-column-first packing',
    'pure layout function',
    'ResizeObserver',
    'aspect-ratio boxes and CLS',
    'absolute positioning',
    'IntersectionObserver sentinel',
    'DOM order vs visual order',
  ],
  companies: ['Flipkart'],
  prerequisites: ['s03-infinite-scroll'],
  frequency: 'occasional',
};

export default meta;
