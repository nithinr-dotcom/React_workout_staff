import type { TaskMeta } from '../../../lib/types';

const meta: TaskMeta = {
  id: 's11-multi-select',
  code: 'S11',
  title: 'Multi-select Dropdown',
  level: 'senior',
  order: 11,
  kind: 'ui',
  minutes: 70,
  summary: 'Filterable multi-select combobox with chips, keyboard navigation, outside-click and Escape handling.',
  concepts: [
    'controlled components',
    'ARIA combobox + listbox (multiselectable)',
    'aria-activedescendant',
    'click-outside detection',
    'focus management',
    'derived filtered state',
  ],
  companies: [],
  prerequisites: ['s02-autocomplete', 'j02-accordion'],
  frequency: 'common',
};

export default meta;
