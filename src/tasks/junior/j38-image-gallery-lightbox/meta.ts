import type { TaskMeta } from '../../../lib/types';

const meta: TaskMeta = {
  id: 'j38-image-gallery-lightbox',
  code: 'J38',
  title: 'Image Gallery with Lightbox',
  level: 'junior',
  order: 38,
  kind: 'ui',
  minutes: 45,
  summary: 'Thumbnail grid that opens a modal lightbox with prev/next, arrow keys, a counter, a focus trap and focus return.',
  concepts: ['modal dialog pattern', 'focus trap', 'focus restoration', 'modular index arithmetic', 'keyboard handling'],
  companies: [],
  prerequisites: ['j12-image-carousel'],
  frequency: 'common',
};

export default meta;
