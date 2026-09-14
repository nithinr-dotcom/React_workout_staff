import type { TaskMeta } from '../../../lib/types';

const meta: TaskMeta = {
  id: 'st10-notification-feed',
  code: 'ST10',
  title: 'Real-time Notification Feed',
  level: 'staff',
  order: 10,
  kind: 'design',
  minutes: 110,
  summary: 'WebSocket-driven feed: normalized bounded store, burst batching, unread state, reconnect with backoff + resync, throttled announcements.',
  concepts: [
    'normalized state',
    'external store + useSyncExternalStore',
    'batching bursts',
    'reconnect with exponential backoff',
    'resync after disconnect',
    'dedupe & bounded memory',
    'aria-live throttling',
  ],
  companies: ['Uber', 'Atlassian', 'Slack', 'LinkedIn'],
  prerequisites: [],
  frequency: 'common',
};

export default meta;
