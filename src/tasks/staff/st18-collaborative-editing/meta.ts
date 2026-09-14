import type { TaskMeta } from '../../../lib/types';

const meta: TaskMeta = {
  id: 'st18-collaborative-editing',
  code: 'ST18',
  title: 'Collaborative Text Editing (OT-lite)',
  level: 'staff',
  order: 18,
  kind: 'design',
  minutes: 120,
  summary: 'Plain-text operational transform (apply / transform / compose) plus an ot.js-style client/server with pending + buffered ops, synced across two textareas under latency.',
  concepts: [
    'operational transform (TP1)',
    'tie-breaking concurrent inserts',
    'operation composition',
    'client state machine (pending / buffer)',
    'server revision history',
    'property-based testing with a seeded PRNG',
    'dependency-injected network simulation',
  ],
  companies: [],
  prerequisites: [],
  frequency: 'occasional',
};

export default meta;
