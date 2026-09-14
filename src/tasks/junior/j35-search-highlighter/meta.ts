import type { TaskMeta } from '../../../lib/types';

const meta: TaskMeta = {
  id: 'j35-search-highlighter',
  code: 'J35',
  title: 'Text Search Highlighter',
  level: 'junior',
  order: 35,
  kind: 'ui',
  minutes: 35,
  summary: 'A pure highlight() that finds case-insensitive, regex-safe matches and merges overlaps, plus a <mark>-based component.',
  concepts: ['regex escaping', 'interval merging', 'pure functions', 'useMemo', 'semantic <mark>', 'TreeWalker'],
  companies: [],
  prerequisites: [],
  frequency: 'common',
};

export default meta;
