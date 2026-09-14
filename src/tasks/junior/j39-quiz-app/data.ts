import type { QuizQuestion } from './types';

/** Sample questions for the Playground. */
export const SAMPLE_QUESTIONS: QuizQuestion[] = [
  {
    id: 'q1',
    question: 'Which hook runs a side effect after React commits to the DOM?',
    options: ['useMemo', 'useEffect', 'useRef', 'useId'],
    answerIndex: 1,
  },
  {
    id: 'q2',
    question: 'What does the `key` prop help React do?',
    options: ['Style list items', 'Match list items between renders', 'Focus elements', 'Sort arrays'],
    answerIndex: 1,
  },
  {
    id: 'q3',
    question: 'Which ARIA role does a group of native radio inputs in a fieldset get?',
    options: ['listbox', 'radiogroup', 'group', 'menu'],
    answerIndex: 2,
  },
  {
    id: 'q4',
    question: 'What does `Promise.allSettled` do when one promise rejects?',
    options: ['Rejects immediately', 'Ignores that promise', 'Waits for all and reports each outcome', 'Retries it'],
    answerIndex: 2,
  },
  {
    id: 'q5',
    question: 'Which CSS property is cheapest to animate?',
    options: ['top', 'width', 'margin-left', 'transform'],
    answerIndex: 3,
  },
];
