import type { TaskMeta } from '../../../lib/types';

const meta: TaskMeta = {
  id: 's34-dom-traversal',
  code: 'S34',
  title: 'getElementsByClassName & DOM traversal',
  level: 'senior',
  order: 34,
  kind: 'js',
  minutes: 50,
  summary: 'Walk the DOM by hand: class-name and computed-style matching, finding the mirror node in an identical tree, and generating unique CSS selectors.',
  concepts: [
    'DOM tree traversal',
    'recursion vs explicit stack',
    'Element vs Node (childNodes vs children)',
    'classList / DOMTokenList',
    'getComputedStyle',
    'value normalization',
    'tree paths',
  ],
  companies: ['Meta', 'Google', 'Microsoft'],
  prerequisites: ['j23-debounce'],
  frequency: 'common',
};

export default meta;
