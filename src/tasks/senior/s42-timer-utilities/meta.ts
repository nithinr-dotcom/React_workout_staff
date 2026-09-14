import type { TaskMeta } from '../../../lib/types';

const meta: TaskMeta = {
  id: 's42-timer-utilities',
  code: 'S42',
  title: 'Timer utilities: sleep, setInterval via setTimeout, clearAllTimeouts, fake clock',
  level: 'senior',
  order: 42,
  kind: 'js',
  minutes: 75,
  summary: 'Abortable sleep, a drift-free setInterval built on setTimeout, a pausable interval, clearAllTimeouts and a fake clock with tick().',
  concepts: ['setTimeout chains', 'timer drift', 'AbortSignal', 'pause/resume state', 'monkey-patching & tracking', 'fake timers internals'],
  companies: ['Meta', 'Dream11'],
  prerequisites: ['j23-debounce'],
  frequency: 'common',
};

export default meta;
