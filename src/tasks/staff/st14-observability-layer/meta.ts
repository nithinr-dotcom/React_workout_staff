import type { TaskMeta } from '../../../lib/types';

const meta: TaskMeta = {
  id: 'st14-observability-layer',
  code: 'ST14',
  title: 'Error Boundary + Observability Layer',
  level: 'staff',
  order: 14,
  kind: 'design',
  minutes: 100,
  summary:
    'A mini Sentry: error boundaries with reset keys, global error capture, breadcrumbs, batched/deduped transport, sampling and PII scrubbing.',
  concepts: [
    'error boundaries',
    'window.onerror / unhandledrejection',
    'batching & flushing',
    'ring buffers',
    'sampling',
    'PII scrubbing',
    'pagehide / sendBeacon',
    'context',
  ],
  companies: ['Intuit', 'Atlassian', 'Datadog'],
  prerequisites: [],
  frequency: 'common',
};

export default meta;
