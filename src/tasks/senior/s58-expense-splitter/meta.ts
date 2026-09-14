import type { TaskMeta } from '../../../lib/types';

const meta: TaskMeta = {
  id: 's58-expense-splitter',
  code: 'S58',
  title: 'Expense Splitter (Splitwise)',
  level: 'senior',
  order: 58,
  kind: 'app',
  minutes: 80,
  summary: 'Splitwise-style group expenses: equal and exact splits in integer paise, derived balances, and a pure simplifyDebts that turns balances into a short list of settlements.',
  concepts: [
    'integer money (minor units)',
    'deterministic rounding',
    'derived state (balances)',
    'pure functions + greedy algorithms',
    'form validation',
    'separating domain logic from UI',
  ],
  companies: ['PhonePe', 'Groww'],
  prerequisites: ['s17-product-cart', 's21-users-directory'],
  frequency: 'occasional',
};

export default meta;
