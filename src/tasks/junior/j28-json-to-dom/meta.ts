import type { TaskMeta } from '../../../lib/types';

const meta: TaskMeta = {
  id: 'j28-json-to-dom',
  code: 'J28',
  title: 'JSON → DOM renderer',
  level: 'junior',
  order: 28,
  kind: 'js',
  minutes: 40,
  summary: 'Turn a virtual-DOM-like JSON tree into real DOM nodes: attributes, className, style objects, event listeners and safe text.',
  concepts: ['DOM APIs', 'recursion', 'virtual DOM', 'attributes vs properties', 'event listeners', 'XSS-safe text'],
  companies: ['Meta', 'Atlassian', 'Uber'],
  prerequisites: ['j26-flatten-get-classnames'],
  frequency: 'common',
};

export default meta;
