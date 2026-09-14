import type { AnyFn, Expectation, MethodKeys, RunnerOptions, Spy, TestRunner } from './types';

// ⬇ Delete this line when you start. Tests for this task are skipped while it exists.
export const NOT_STARTED = true;

export function createTestRunner(options: RunnerOptions = {}): TestRunner {
  // Your implementation here. Requirements are in README.md.
  void options;
  throw new Error('createTestRunner: not implemented');
}

export function expect(actual: unknown): Expectation {
  void actual;
  throw new Error('expect: not implemented');
}

export function spyOn<T extends object, K extends MethodKeys<T>>(obj: T, method: K): Spy<Extract<T[K], AnyFn>> {
  void obj;
  void method;
  throw new Error('spyOn: not implemented');
}
