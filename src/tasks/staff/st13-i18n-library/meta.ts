import type { TaskMeta } from '../../../lib/types';

const meta: TaskMeta = {
  id: 'st13-i18n-library',
  code: 'ST13',
  title: 'i18n Library',
  level: 'staff',
  order: 13,
  kind: 'design',
  minutes: 100,
  summary:
    'An i18n runtime: lazy locale catalogs, ICU-lite plurals via Intl.PluralRules, fallback chains, Intl formatting and RTL switching.',
  concepts: [
    'Intl.PluralRules',
    'Intl.NumberFormat / DateTimeFormat',
    'message parsing',
    'lazy loading',
    'context + external store',
    'RTL',
    'fallback chains',
  ],
  companies: ['Atlassian', 'Airbnb', 'Booking.com'],
  prerequisites: [],
  frequency: 'occasional',
};

export default meta;
