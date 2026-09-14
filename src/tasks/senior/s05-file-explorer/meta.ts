import type { TaskMeta } from '../../../lib/types';

const meta: TaskMeta = {
  id: 's05-file-explorer',
  code: 'S05',
  title: 'File Explorer',
  level: 'senior',
  order: 5,
  kind: 'ui',
  minutes: 75,
  summary: 'A VS Code-style file tree: expand/collapse, create, rename inline, delete with confirmation, full ARIA tree keyboard support.',
  concepts: [
    'recursive rendering',
    'normalized tree state',
    'useReducer',
    'ARIA tree view pattern',
    'roving tabindex',
    'focus management',
    'inline editing',
    'derived sorting',
  ],
  companies: ['Atlassian', 'Rippling', 'Microsoft', 'Flipkart'],
  prerequisites: ['j02-accordion', 'j03-tabs'],
  frequency: 'very-common',
  star: true,
};

export default meta;
