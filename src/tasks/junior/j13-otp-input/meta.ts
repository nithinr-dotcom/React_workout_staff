import type { TaskMeta } from '../../../lib/types';

const meta: TaskMeta = {
  id: 'j13-otp-input',
  code: 'J13',
  title: 'OTP Input',
  level: 'junior',
  order: 13,
  kind: 'ui',
  minutes: 40,
  summary: 'One box per digit with auto-advance, Backspace and arrow navigation, paste distribution and onComplete.',
  concepts: ['refs to a list of inputs', 'focus management', 'keyboard events', 'clipboard events', 'controlled inputs', 'input sanitising'],
  companies: ['Swiggy', 'Razorpay', 'PhonePe', 'Uber'],
  prerequisites: ['j02-accordion'],
  frequency: 'very-common',
  star: true,
};

export default meta;
