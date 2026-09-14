import type { TaskMeta } from '../../../lib/types';

const meta: TaskMeta = {
  id: 'st05-mini-redux',
  code: 'ST05',
  title: 'Mini Redux + useSyncExternalStore + selectors',
  level: 'staff',
  order: 5,
  kind: 'design',
  minutes: 100,
  summary: 'Build createStore, middleware and combineReducers, then React bindings whose useSelector only re-renders when the selected slice changes.',
  concepts: [
    'external stores',
    'useSyncExternalStore',
    'selectors and equality',
    'middleware composition',
    'reducer composition',
    'referential stability',
    'render counting',
  ],
  companies: ['Atlassian', 'Meta', 'Flipkart', 'Uber'],
  prerequisites: ['j25-hooks-pack'],
  frequency: 'common',
};

export default meta;
