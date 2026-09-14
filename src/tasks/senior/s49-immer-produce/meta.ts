import type { TaskMeta } from '../../../lib/types';

const meta: TaskMeta = {
  id: 's49-immer-produce',
  code: 'S49',
  title: 'Immutable updates: produce() like Immer',
  level: 'senior',
  order: 49,
  kind: 'js',
  minutes: 75,
  summary:
    'Implement Immer’s produce(): a recipe mutates a Proxy draft, and you return a new state with structural sharing, or the base itself when nothing changed.',
  concepts: [
    'Proxy get/set/deleteProperty traps',
    'copy-on-write',
    'structural sharing and reference equality',
    'lazy child drafts',
    'finalizing and revoking drafts',
    'why React state must be immutable',
  ],
  companies: [],
  prerequisites: ['s29-deep-clone-equal'],
  frequency: 'occasional',
};

export default meta;
