import type { TaskMeta } from '../../../lib/types';

const meta: TaskMeta = {
  id: 'j25-hooks-pack',
  code: 'J25',
  title: 'Hooks pack',
  level: 'junior',
  order: 25,
  kind: 'hook',
  minutes: 45,
  summary: 'Write five everyday custom hooks: useToggle, usePrevious, useLocalStorage, useClickOutside and useDebounce.',
  concepts: ['custom hooks', 'useRef', 'useEffect cleanup', 'stable callbacks', 'lazy state initialisation', 'event listeners', 'renderHook'],
  companies: ['Atlassian', 'Flipkart', 'Swiggy', 'Razorpay'],
  prerequisites: ['j23-debounce'],
  frequency: 'very-common',
};

export default meta;
