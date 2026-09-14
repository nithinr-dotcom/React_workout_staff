import type { TaskMeta } from '../../../lib/types';

const meta: TaskMeta = {
  id: 'j33-responsive-navbar',
  code: 'J33',
  title: 'Responsive Navbar with Hamburger Menu',
  level: 'junior',
  order: 33,
  kind: 'ui',
  minutes: 40,
  summary: 'Inline links on desktop, a disclosure hamburger menu on mobile, a nested submenu, aria-current and focus return.',
  concepts: ['disclosure pattern', 'aria-current', 'matchMedia subscription', 'focus restoration', 'accessible hiding'],
  companies: [],
  prerequisites: ['j02-accordion'],
  frequency: 'common',
};

export default meta;
