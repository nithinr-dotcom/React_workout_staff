import type { TaskMeta } from '../../../lib/types';

const meta: TaskMeta = {
  id: 'st08-form-builder',
  code: 'ST08',
  title: 'Schema-driven Form Builder',
  level: 'staff',
  order: 8,
  kind: 'design',
  minutes: 120,
  summary: 'Render forms from a schema: dependent fields, sync + debounced async validation, groups, arrays and a registry for custom field types.',
  concepts: [
    'schema-driven UI',
    'recursive rendering',
    'form state normalisation',
    'async validation and races',
    'extensibility via registries',
    'accessible error messaging',
  ],
  companies: ['Rippling', 'Atlassian', 'Intuit', 'Razorpay'],
  prerequisites: ['j05-signup-form'],
  frequency: 'common',
};

export default meta;
