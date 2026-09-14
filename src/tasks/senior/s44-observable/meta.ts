import type { TaskMeta } from '../../../lib/types';

const meta: TaskMeta = {
  id: 's44-observable',
  code: 'S44',
  title: 'Observable & Subject',
  level: 'senior',
  order: 44,
  kind: 'js',
  minutes: 75,
  summary: 'Build a minimal Observable with teardown, from/interval/fromEvent, pipe with map & filter, and a multicasting Subject.',
  concepts: ['observer pattern', 'cold vs hot streams', 'teardown & cleanup', 'operator functions', 'cancellation by unsubscribe', 'classes'],
  companies: ['Meta'],
  prerequisites: ['s28-event-emitter'],
  frequency: 'occasional',
};

export default meta;
