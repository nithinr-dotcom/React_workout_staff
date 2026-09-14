import type { TaskMeta } from '../../../lib/types';

const meta: TaskMeta = {
  id: 'st17-rich-text-editor',
  code: 'ST17',
  title: 'Rich Text Editor (model-driven)',
  level: 'staff',
  order: 17,
  kind: 'design',
  minutes: 120,
  summary: 'Editor whose source of truth is a document model, not innerHTML: pure edit commands, safe HTML serialize/parse for paste, a contenteditable view with toolbar, shortcuts and grouped undo.',
  concepts: [
    'document model (blocks, runs, marks)',
    'pure, immutable edit commands',
    'normalization invariants',
    'HTML escaping and paste sanitization',
    'contenteditable + beforeinput',
    'undo grouping',
    'toggle buttons with aria-pressed',
  ],
  companies: ['Atlassian'],
  prerequisites: [],
  frequency: 'occasional',
};

export default meta;
