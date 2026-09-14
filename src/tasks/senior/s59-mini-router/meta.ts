import type { TaskMeta } from '../../../lib/types';

const meta: TaskMeta = {
  id: 's59-mini-router',
  code: 'S59',
  title: 'Mini client-side router',
  level: 'senior',
  order: 59,
  kind: 'ui',
  minutes: 75,
  summary:
    'Build Router, Routes/Route, Link, useParams and useNavigate on top of history.pushState and popstate, with dynamic segments, a 404 fallback and working back/forward.',
  concepts: [
    'History API (pushState, replaceState, popstate)',
    'React context for router state',
    'path matching with dynamic segments',
    'event interception (modifier keys, defaultPrevented)',
    'config components (Route renders nothing itself)',
  ],
  companies: [],
  prerequisites: ['j25-hooks-pack'],
  frequency: 'occasional',
};

export default meta;
