import type { TaskMeta } from '../../../lib/types';

const meta: TaskMeta = {
  id: 's48-in-memory-file-system',
  code: 'S48',
  title: 'In-memory file system API',
  level: 'senior',
  order: 48,
  kind: 'js',
  minutes: 75,
  summary:
    'Start with Airbnb’s create/get/set path store, then grow it into a small file system: mkdir -p, read/write, ls, rm -r, mv, path normalization and typed errors.',
  concepts: [
    'trie / tree of Maps',
    'path normalization',
    'typed errors with codes',
    'class API design',
    'invariants (no moving into yourself)',
    'recursive vs iterative subtree operations',
  ],
  companies: ['Airbnb'],
  prerequisites: ['s35-transactional-store', 's05-file-explorer'],
  frequency: 'occasional',
};

export default meta;
