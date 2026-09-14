import type { TaskMeta } from '../../../lib/types';

const meta: TaskMeta = {
  id: 'st16-paged-book-reader',
  code: 'ST16',
  title: 'Paged Book Reader with page cache & preloading',
  level: 'staff',
  order: 16,
  kind: 'design',
  minutes: 110,
  summary: 'Scroll through a book whose pages come from a slow API: virtualized page slots, fetch only near the viewport, cancel skipped pages, ±2 preload, 20-page LRU cache, retry per page.',
  concepts: [
    'virtualized scrolling with fixed-height slots',
    'viewport-driven data fetching',
    'request cancellation (AbortController)',
    'LRU cache with a memory cap',
    'preloading buffers',
    'per-item loading / error states',
    'dependency injection for testability',
  ],
  companies: ['Dream11'],
  prerequisites: [],
  frequency: 'occasional',
};

export default meta;
