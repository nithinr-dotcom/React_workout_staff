import type { TaskMeta } from '../../../lib/types';

const meta: TaskMeta = {
  id: 's47-dom-tree-utils',
  code: 'S47',
  title: 'DOM tree puzzles: twin node, table of contents, tree height',
  level: 'senior',
  order: 47,
  kind: 'js',
  minutes: 60,
  summary:
    'Four DOM tree utilities: find the twin node in a cloned tree by index path, build a nested table of contents from headings, and measure height and levels without recursion.',
  concepts: [
    'tree paths via parentElement + sibling index',
    'stack-based nesting (heading outline)',
    'slug generation and de-duplication',
    'breadth-first traversal with a queue',
    'recursion depth limits',
  ],
  companies: ['Flipkart', 'Google', 'Amazon', 'Meta'],
  prerequisites: ['s34-dom-traversal'],
  frequency: 'common',
};

export default meta;
