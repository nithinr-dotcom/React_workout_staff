import type { TaskMeta } from '../../../lib/types';

const meta: TaskMeta = {
  id: 's36-virtual-dom',
  code: 'S36',
  title: 'Virtual DOM: createElement, render & diff',
  level: 'senior',
  order: 36,
  kind: 'js',
  minutes: 60,
  summary: 'Build a tiny virtual DOM: h() to describe trees, render() to mount them and patch() to apply minimal DOM updates that preserve node identity.',
  concepts: [
    'virtual DOM',
    'reconciliation',
    'tree diffing',
    'node identity',
    'attributes vs properties',
    'event listener management',
    'keyed children',
    'MutationObserver',
  ],
  companies: ['Intuit', 'Meta', 'Atlassian', 'Microsoft'],
  prerequisites: ['s34-dom-traversal', 's29-deep-clone-equal'],
  frequency: 'common',
};

export default meta;
