import type { TaskMeta } from '../../../lib/types';

const meta: TaskMeta = {
  id: 's03-infinite-scroll',
  code: 'S03',
  title: 'Infinite Scroll Feed',
  level: 'senior',
  order: 3,
  kind: 'ui',
  minutes: 60,
  summary: 'Cursor-paginated feed that loads more with IntersectionObserver, without duplicate loads, with dedupe, end and retry states.',
  concepts: [
    'IntersectionObserver',
    'cursor pagination',
    'refs vs state for in-flight guards',
    'AbortController',
    'deduplication',
    'error + retry states',
    'ARIA feed pattern',
  ],
  companies: ['Swiggy', 'Rippling', 'Meta', 'Flipkart'],
  prerequisites: ['j11-pagination', 'j25-hooks-pack'],
  frequency: 'very-common',
  star: true,
};

export default meta;
