import type { TaskMeta } from '../../../lib/types';

const meta: TaskMeta = {
  id: 'j29-hooks-pack-2',
  code: 'J29',
  title: 'Hooks pack II',
  level: 'junior',
  order: 29,
  kind: 'hook',
  minutes: 45,
  summary:
    'Nine more everyday hooks: useInterval, useTimeout, useThrottle, useWindowSize, useMediaQuery, useHover, useEventListener, useIsFirstRender and useUpdateEffect.',
  concepts: [
    'custom hooks',
    'latest-callback ref',
    'timers in effects',
    'effect cleanup',
    'event subscriptions',
    'matchMedia',
    'SSR guards',
    'renderHook with fake timers',
  ],
  companies: [],
  prerequisites: ['j25-hooks-pack'],
  frequency: 'very-common',
};

export default meta;
