import type { TaskMeta } from '../../../lib/types';

const meta: TaskMeta = {
  id: 's19-chat-ui',
  code: 'S19',
  title: 'Chat UI',
  level: 'senior',
  order: 19,
  kind: 'app',
  minutes: 75,
  summary: 'Real-time chat over a socket: connection status, composer, smart auto-scroll with unread count, capped history.',
  concepts: [
    'WebSocket lifecycle in effects',
    'event listener cleanup',
    'scroll position management',
    'useLayoutEffect',
    'bounded lists',
    'role="log" live regions',
    'reconnect with backoff',
  ],
  companies: ['Meta', 'Slack', 'Atlassian', 'Microsoft'],
  prerequisites: ['s03-infinite-scroll', 's10-toast-system', 's32-retry-backoff'],
  frequency: 'common',
};

export default meta;
