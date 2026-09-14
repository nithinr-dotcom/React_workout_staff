import type { TaskMeta } from '../../../lib/types';

const meta: TaskMeta = {
  id: 's54-product-review-flow',
  code: 'S54',
  title: 'Product Review Workflow',
  level: 'senior',
  order: 54,
  kind: 'app',
  minutes: 90,
  summary: 'Purchases list with loading/error/retry, a two-step review pane (stars, then text with a live counter), per-product drafts in localStorage and a success toast.',
  concepts: [
    'async loading / error / retry states',
    'multi-step form state',
    'derived validation',
    'localStorage persistence',
    'radio group a11y',
    'live regions (status toast)',
    'dependency injection for testability',
  ],
  companies: ['Flipkart'],
  prerequisites: ['s21-users-directory', 's10-toast-system'],
  frequency: 'occasional',
};

export default meta;
