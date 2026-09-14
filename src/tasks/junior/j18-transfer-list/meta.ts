import type { TaskMeta } from '../../../lib/types';

const meta: TaskMeta = {
  id: 'j18-transfer-list',
  code: 'J18',
  title: 'Transfer List',
  level: 'junior',
  order: 18,
  kind: 'ui',
  minutes: 40,
  summary: 'Two checkbox lists with move-selected, move-all and a tri-state select-all checkbox.',
  concepts: ['lifting state', 'Set-based selection', 'indeterminate checkbox', 'derived disabled states', 'immutable list updates'],
  companies: [],
  prerequisites: ['j01-todo-list'],
  frequency: 'common',
};

export default meta;
