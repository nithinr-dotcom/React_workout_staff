import type { TaskMeta } from '../../../lib/types';

const meta: TaskMeta = {
  id: 'st04-spreadsheet',
  code: 'ST04',
  title: 'Spreadsheet with formulas',
  level: 'staff',
  order: 4,
  kind: 'app',
  minutes: 120,
  summary: 'A 26×50 editable grid with a formula engine: parsing, dependency graph, incremental topological recompute, cycle and error handling.',
  concepts: [
    'tokenizer + recursive-descent parser',
    'dependency graph',
    'topological sort',
    'cycle detection',
    'incremental recompute',
    'external store + fine-grained subscriptions',
    'grid keyboard editing',
  ],
  companies: ['Google', 'Microsoft', 'Airtable', 'Notion', 'Rippling'],
  prerequisites: [],
  frequency: 'occasional',
};

export default meta;
