import type { TaskMeta } from '../../../lib/types';

const meta: TaskMeta = {
  id: 'j27-polyfills',
  code: 'J27',
  title: 'Polyfills: map, filter, reduce, bind, call, apply',
  level: 'junior',
  order: 27,
  kind: 'js',
  minutes: 40,
  summary: 'Re-implement map, filter, reduce, call, apply and bind as standalone functions, matching the spec on sparse arrays, TypeErrors and `this`.',
  concepts: ['this binding', 'prototypes', 'sparse arrays', 'TypeError semantics', 'partial application', 'Symbol keys'],
  companies: ['Flipkart', 'Swiggy', 'Razorpay', 'Paytm', 'Microsoft', 'Amazon'],
  prerequisites: [],
  frequency: 'very-common',
};

export default meta;
