import type { TaskMeta } from '../../../lib/types';

const meta: TaskMeta = {
  id: 'st11-offline-sync',
  code: 'ST11',
  title: 'Offline-first Sync (todos)',
  level: 'staff',
  order: 11,
  kind: 'design',
  minutes: 110,
  summary: 'Local-first todo engine: optimistic writes, persisted outbox, replay on reconnect with backoff, last-write-wins conflicts surfaced to the user.',
  concepts: [
    'local-first architecture',
    'optimistic updates',
    'persistent outbox queue',
    'retry with exponential backoff',
    'conflict resolution (LWW)',
    'online/offline detection',
    'dependency injection for testability',
  ],
  companies: ['Atlassian', 'Notion', 'Linear', 'Google'],
  prerequisites: [],
  frequency: 'occasional',
};

export default meta;
