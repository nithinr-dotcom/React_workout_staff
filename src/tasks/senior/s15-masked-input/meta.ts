import type { TaskMeta } from '../../../lib/types';

const meta: TaskMeta = {
  id: 's15-masked-input',
  code: 'S15',
  title: 'Masked Input (card / phone)',
  level: 'senior',
  order: 15,
  kind: 'ui',
  minutes: 60,
  summary: 'Format digits into a mask as the user types, keeping the caret in place for mid-string edits and pastes.',
  concepts: [
    'controlled inputs',
    'caret / selection management',
    'useLayoutEffect',
    'raw vs display value',
    'paste and deletion handling',
    'inputMode & autocomplete',
  ],
  companies: ['Klarna'],
  prerequisites: [],
  frequency: 'occasional',
};

export default meta;
