import type { TaskMeta } from '../../../lib/types';

const meta: TaskMeta = {
  id: 'st01-select-combobox',
  code: 'ST01',
  title: 'Design-system Select / Combobox',
  level: 'staff',
  order: 1,
  kind: 'design',
  minutes: 110,
  summary: 'A compound, controlled/uncontrolled Select with the full APG select-only combobox pattern, typeahead and form integration.',
  concepts: [
    'compound components',
    'controlled vs uncontrolled',
    'context + collection registration',
    'APG combobox / listbox',
    'aria-activedescendant',
    'typeahead',
    'form integration',
    'API design',
  ],
  companies: ['Atlassian', 'Adobe', 'Shopify', 'Microsoft'],
  prerequisites: ['j02-accordion'],
  frequency: 'very-common',
};

export default meta;
