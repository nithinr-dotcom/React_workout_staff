import { describe } from 'vitest';

/**
 * Chooses what a task's acceptance tests run against.
 *
 *   npm test -- j02                → your Solution (skipped while it still exports NOT_STARTED)
 *   npm run test:followups -- j02  → your Solution, including follow-up suites
 *   npm run test:ref -- j02        → the Reference, including follow-ups (skipped while it is a placeholder)
 *
 * Usage in task.test.tsx:
 *   import * as Solution from './Solution';
 *   import * as Reference from './Reference';
 *   const { impl, describeTask, describeFollowUp } = pickTarget(Solution, Reference);
 */
export function pickTarget<T extends object>(solution: T, reference: object) {
  const target = import.meta.env.VITE_TEST_TARGET === 'reference' ? 'reference' : 'solution';
  const followUpsEnabled = target === 'reference' || import.meta.env.VITE_FOLLOWUPS === '1';
  const impl = (target === 'reference' ? reference : solution) as T;

  const skipReason =
    target === 'reference' && 'NOT_IMPLEMENTED' in reference
      ? 'reference not written yet'
      : target === 'solution' && 'NOT_STARTED' in solution
        ? 'solution not started (delete the NOT_STARTED export to run)'
        : null;

  /** Base requirements. */
  const describeTask = (name: string, fn: () => void) =>
    skipReason ? describe.skip(`${name} [${target}: ${skipReason}]`, fn) : describe(`${name} [${target}]`, fn);

  /** Follow-up N from the README. Runs for your solution only with `npm run test:followups`. */
  const describeFollowUp = (n: number, name: string, fn: () => void) => {
    const title = `Follow-up ${n}: ${name} [${target}]`;
    if (skipReason) return describe.skip(`${title} (${skipReason})`, fn);
    if (!followUpsEnabled) return describe.skip(`${title} (run npm run test:followups)`, fn);
    return describe(title, fn);
  };

  return { impl, target, describeTask, describeFollowUp };
}
