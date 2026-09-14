import type { TaskMeta } from '../../../lib/types';

const meta: TaskMeta = {
  id: 'j09-theme-toggle',
  code: 'J09',
  title: 'Theme Toggle',
  level: 'junior',
  order: 9,
  kind: 'ui',
  minutes: 35,
  summary: 'ThemeProvider + useTheme with light/dark/system, CSS variables, persistence and prefers-color-scheme.',
  concepts: ['React context', 'custom hooks', 'localStorage', 'matchMedia', 'CSS custom properties', 'effects & subscriptions'],
  companies: ['Flipkart', 'Atlassian', 'Zomato'],
  prerequisites: ['j01-todo-list'],
  frequency: 'common',
};

export default meta;
