import type { TaskMeta } from '../../../lib/types';

const meta: TaskMeta = {
  id: 's28-event-emitter',
  code: 'S28',
  title: 'Event Emitter',
  level: 'senior',
  order: 28,
  kind: 'js',
  minutes: 45,
  summary: 'Build a Node-style EventEmitter with on/off/once/emit, safe removal during emit, wildcard listeners and waitFor.',
  concepts: ['pub/sub', 'classes', 'Map & arrays', 'snapshot iteration', 'closures', 'AbortSignal'],
  companies: ['Meta', 'Google', 'Rippling', 'Microsoft', 'Atlassian'],
  prerequisites: ['j23-debounce'],
  frequency: 'very-common',
  star: true,
};

export default meta;
