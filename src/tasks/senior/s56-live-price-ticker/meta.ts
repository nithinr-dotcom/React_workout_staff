import type { TaskMeta } from '../../../lib/types';

const meta: TaskMeta = {
  id: 's56-live-price-ticker',
  code: 'S56',
  title: 'Live Price Ticker / Order Book',
  level: 'senior',
  order: 56,
  kind: 'app',
  minutes: 75,
  summary: 'A streaming price table: rAF-coalesced tick bursts, restartable up/down flashes, live sorting by change %, pause/resume and Intl formatting.',
  concepts: [
    'subscription lifecycle in effects',
    'requestAnimationFrame batching',
    'refs for high-frequency data',
    'restartable CSS animations',
    'Intl.NumberFormat',
    'derived sorting',
    'aria-sort',
  ],
  companies: ['Coinbase'],
  prerequisites: ['s19-chat-ui', 's08-data-table'],
  frequency: 'occasional',
};

export default meta;
