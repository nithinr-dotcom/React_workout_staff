import type { TaskMeta } from '../../../lib/types';

const meta: TaskMeta = {
  id: 'st09-feature-flags',
  code: 'ST09',
  title: 'Feature Flag Framework',
  level: 'staff',
  order: 9,
  kind: 'design',
  minutes: 105,
  summary: 'Flag client + React bindings: targeting rules, stable percentage rollouts, no-flicker bootstrap, live updates, deduped exposures.',
  concepts: [
    'pure evaluation engine',
    'stable hashing / bucketing',
    'useSyncExternalStore',
    'bootstrap vs async fetch (no flicker)',
    'live subscriptions',
    'exposure logging',
    'SDK API design',
  ],
  companies: ['Atlassian', 'Uber', 'Airbnb'],
  prerequisites: [],
  frequency: 'common',
};

export default meta;
