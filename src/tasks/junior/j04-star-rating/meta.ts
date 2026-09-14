import type { TaskMeta } from '../../../lib/types';

const meta: TaskMeta = {
  id: 'j04-star-rating',
  code: 'J04',
  title: 'Star Rating',
  level: 'junior',
  order: 4,
  kind: 'ui',
  minutes: 30,
  summary: 'A star rating input with hover preview, click-to-clear, keyboard support, controlled and read-only modes.',
  concepts: ['controlled vs uncontrolled', 'hover state', 'ARIA radio group', 'keyboard navigation', 'derived display state'],
  companies: ['Amazon', 'Swiggy', 'Zomato', 'Flipkart'],
  prerequisites: ['j03-tabs'],
  frequency: 'common',
};

export default meta;
