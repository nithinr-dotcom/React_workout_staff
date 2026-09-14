import type { TaskMeta } from '../../../lib/types';

const meta: TaskMeta = {
  id: 'j12-image-carousel',
  code: 'J12',
  title: 'Image Carousel',
  level: 'junior',
  order: 12,
  kind: 'ui',
  minutes: 45,
  summary: 'Prev/next with wrap-around, dot navigation, autoplay that pauses on hover/focus, keyboard and live-region support.',
  concepts: ['modular index arithmetic', 'intervals & cleanup', 'pause/resume state', 'ARIA carousel pattern', 'live regions'],
  companies: ['Flipkart', 'Myntra', 'Airbnb', 'Amazon'],
  prerequisites: ['j03-tabs', 'j06-traffic-light'],
  frequency: 'very-common',
};

export default meta;
