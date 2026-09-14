import type { TaskMeta } from '../../../lib/types';

const meta: TaskMeta = {
  id: 'j40-password-generator',
  code: 'J40',
  title: 'Password Generator with Strength Meter',
  level: 'junior',
  order: 40,
  kind: 'app',
  minutes: 40,
  summary: 'Generate passwords from a length slider and character-set checkboxes, copy them to the clipboard and rate their strength.',
  concepts: [
    'controlled range and checkbox inputs',
    'injected randomness',
    'derived state',
    'Clipboard API',
    'timeouts with cleanup',
    'role="meter"',
  ],
  companies: [],
  prerequisites: ['j05-signup-form'],
  frequency: 'occasional',
};

export default meta;
