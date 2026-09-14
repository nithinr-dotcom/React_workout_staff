import type { TaskMeta } from '../../../lib/types';

const meta: TaskMeta = {
  id: 's17-product-cart',
  code: 'S17',
  title: 'Product Listing + Cart',
  level: 'senior',
  order: 17,
  kind: 'app',
  minutes: 90,
  summary: 'E-commerce listing with filter, search and sort, plus a persisted cart with quantities, stock limits and Intl-formatted totals.',
  concepts: [
    'useReducer',
    'derived state',
    'data fetching with AbortController',
    'Intl.NumberFormat',
    'money in integer cents',
    'localStorage persistence',
  ],
  companies: ['Flipkart', 'Swiggy', 'Meesho', 'Amazon'],
  prerequisites: ['j01-todo-list', 'j25-hooks-pack'],
  frequency: 'common',
};

export default meta;
