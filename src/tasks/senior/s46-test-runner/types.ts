export type TestFn = () => void | Promise<void>;
export type HookFn = () => void | Promise<void>;

export type TestStatus = 'passed' | 'failed' | 'skipped';

export interface TestResult {
  /** Describe names and the test name joined with " > ", e.g. "cart > totals > adds tax". */
  name: string;
  status: TestStatus;
  /** The thrown or rejected value for failed tests. Undefined otherwise. */
  error?: unknown;
}

export interface RunReport {
  passed: number;
  failed: number;
  /** Follow-up 1 */
  skipped?: number;
  /** One entry per registered test, in declaration order. */
  results: TestResult[];
}

export interface ItFn {
  (name: string, fn: TestFn, timeoutMs?: number): void;
  /** Follow-up 1 */
  skip(name: string, fn: TestFn, timeoutMs?: number): void;
  /** Follow-up 1 */
  only(name: string, fn: TestFn, timeoutMs?: number): void;
}

export interface DescribeFn {
  (name: string, fn: () => void): void;
  /** Follow-up 1 */
  skip(name: string, fn: () => void): void;
  /** Follow-up 1 */
  only(name: string, fn: () => void): void;
}

export interface RunnerOptions {
  /** Default timeout per test, in ms. Default 5000. */
  timeout?: number;
}

export interface TestRunner {
  describe: DescribeFn;
  it: ItFn;
  beforeEach(fn: HookFn): void;
  afterEach(fn: HookFn): void;
  /** Runs every registered test, one at a time, and resolves with the report. Never rejects because a test failed. */
  run(): Promise<RunReport>;
}

export interface Matchers {
  toBe(expected: unknown): void;
  toEqual(expected: unknown): void;
  toThrow(expected?: string | RegExp | (new (...args: any[]) => Error)): void;
  toContain(item: unknown): void;
  /** Follow-up 2 */
  toHaveBeenCalled(): void;
  /** Follow-up 2 */
  toHaveBeenCalledTimes(times: number): void;
  /** Follow-up 2 */
  toHaveBeenCalledWith(...args: unknown[]): void;
}

export interface Expectation extends Matchers {
  not: Matchers;
}

export type AnyFn = (...args: any[]) => any;

export type Spy<F extends AnyFn = AnyFn> = F & {
  /** The arguments of every call, in order. */
  calls: Parameters<F>[];
  /** Replace the behaviour. The spy still records calls. Returns the spy. */
  mockImplementation(impl: F): Spy<F>;
  /** Put the original method back on the object. */
  restore(): void;
};

export type MethodKeys<T> = { [K in keyof T]: T[K] extends AnyFn ? K : never }[keyof T];

export interface TestRunnerModule {
  createTestRunner(options?: RunnerOptions): TestRunner;
  expect(actual: unknown): Expectation;
  spyOn<T extends object, K extends MethodKeys<T>>(obj: T, method: K): Spy<Extract<T[K], AnyFn>>;
}
