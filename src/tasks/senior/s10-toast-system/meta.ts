import type { TaskMeta } from '../../../lib/types';

const meta: TaskMeta = {
  id: 's10-toast-system',
  code: 'S10',
  title: 'Toast Notification System',
  level: 'senior',
  order: 10,
  kind: 'ui',
  minutes: 75,
  summary: 'A ToastProvider + useToast() API with auto-dismiss, hover pause, a max-visible queue and live regions.',
  concepts: ['context', 'custom hooks', 'portals', 'timers', 'queues', 'aria-live regions', 'API design'],
  companies: ['Atlassian', 'Razorpay', 'Microsoft'],
  prerequisites: ['j23-debounce', 'j25-hooks-pack', 's01-modal-dialog'],
  frequency: 'common',
};

export default meta;
