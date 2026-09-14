import type { TaskMeta } from '../../../lib/types';

const meta: TaskMeta = {
  id: 's02-autocomplete',
  code: 'S02',
  title: 'Autocomplete / Typeahead',
  level: 'senior',
  order: 2,
  kind: 'ui',
  minutes: 75,
  summary: 'Debounced async search with cancellation, stale-response guarding, caching and the ARIA combobox pattern.',
  concepts: [
    'debouncing',
    'AbortController',
    'race conditions',
    'request caching',
    'ARIA combobox pattern',
    'aria-activedescendant',
    'keyboard navigation',
    'loading / empty / error states',
  ],
  companies: ['Swiggy', 'Flipkart', 'Uber', 'Google', 'Meta', 'Atlassian', 'Razorpay'],
  prerequisites: ['j23-debounce', 'j25-hooks-pack'],
  frequency: 'very-common',
  star: true,
};

export default meta;
