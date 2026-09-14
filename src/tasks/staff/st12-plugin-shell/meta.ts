import type { TaskMeta } from '../../../lib/types';

const meta: TaskMeta = {
  id: 'st12-plugin-shell',
  code: 'ST12',
  title: 'Plugin Architecture / Micro-frontend Shell',
  level: 'staff',
  order: 12,
  kind: 'design',
  minutes: 110,
  summary:
    'A plugin host with extension points, lazy loading, version checks, sandboxed context and per-slot error isolation.',
  concepts: [
    'extension points',
    'lazy loading',
    'error boundaries',
    'useSyncExternalStore',
    'disposables & cleanup',
    'event bus',
    'namespaced storage',
    'semver compatibility',
  ],
  companies: ['Atlassian', 'Microsoft', 'Salesforce'],
  prerequisites: [],
  frequency: 'occasional',
};

export default meta;
