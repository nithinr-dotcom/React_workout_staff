import type { TaskMeta } from '../../../lib/types';

const meta: TaskMeta = {
  id: 's57-video-player',
  code: 'S57',
  title: 'Custom Video Player Controls',
  level: 'senior',
  order: 57,
  kind: 'ui',
  minutes: 75,
  summary: 'Custom controls over a <video>: media events as the source of truth, seek/volume sliders, buffered bar, rate, fullscreen, keyboard shortcuts and auto-hide.',
  concepts: [
    'HTMLMediaElement API and events',
    'media element as the source of truth',
    'native range inputs + aria-valuetext',
    'Fullscreen API',
    'scoped keyboard shortcuts',
    'inactivity timers',
    'stubbing browser APIs in jsdom',
  ],
  companies: [],
  prerequisites: ['j12-image-carousel'],
  frequency: 'occasional',
};

export default meta;
