# Mini test runner, expect & spy

## Problem statement
You use `describe`, `it`, `expect` and `vi.fn` every day. Can you build them? This task asks for a tiny Jest:

1. **A runner.** `createTestRunner()` returns `describe`, `it`, `beforeEach`, `afterEach` and `run`. Tests are registered first, then `run()` executes them one at a time (async tests included, each with a timeout) and resolves with a report like `{ passed, failed, results: [{ name: 'cart > totals > adds tax', status, error }] }`.
2. **`expect(actual)`** with `toBe`, `toEqual` (deep), `toThrow`, `toContain`, and `.not` for all of them.
3. **`spyOn(obj, method)`**, which wraps a method to record calls, can swap in a fake with `mockImplementation`, and can `restore` the original.

The pieces come from real questions: GreatFrontEnd's Test Runner series, BFE #38 `jest.spyOn` and BFE #161 `toBe()` with `.not`. It's also good practice for a different kind of round. Atlassian and Coinbase interviews often ask you to **write tests** for your own code. Once you've built `beforeEach` scoping and a spy, you'll know exactly what your test tools are doing and how to use them well.

## Clarifying questions to ask
- When do `describe` callbacks run? *(Immediately, during registration, like Jest. They must be synchronous. Test bodies only run inside `run()`.)*
- In what order do tests run? *(Declaration order, one at a time. The next test starts only after the previous test and its hooks have finished.)*
- How are names built? *(Every enclosing `describe` name plus the test name, joined with `" > "`. A top-level test is just its own name.)*
- Which hooks apply to a test? *(Every `beforeEach`/`afterEach` registered in its own describe block or any enclosing one, including top-level hooks. Before hooks run outermost first; after hooks run innermost first.)*
- What if `beforeEach` throws? *(The test is reported as failed with that error, and its body doesn't run. `afterEach` hooks still run.)*
- What if `afterEach` throws? *(If the test had passed, it's reported as failed with that error. Otherwise the test's own error is kept.)*
- How do timeouts work? *(`createTestRunner({ timeout })` sets the default, 5000ms. `it(name, fn, timeoutMs)` overrides it for one test. A test that takes longer fails with an `Error` whose message contains `timed out`, and the run continues.)*
- What does a failed matcher do? *(Throws an `Error` with a helpful message. The runner turns that into a failed test.)*
- How deep is `toEqual`? *(Primitives with `Object.is`; arrays element by element with equal length; plain objects with the same own enumerable keys and equal values. An array never equals a plain object. `Map`, `Set`, `Date` and class instances are out of scope.)*

## Functional requirements
### Runner
- [ ] `createTestRunner(options?)` returns an independent runner. Two runners never share tests or hooks.
- [ ] `describe(name, fn)` calls `fn` synchronously. Tests and hooks registered inside belong to that block. Blocks nest.
- [ ] `it(name, fn, timeoutMs?)` registers a test. `fn` may be sync or return a promise.
- [ ] `beforeEach(fn)` / `afterEach(fn)` register hooks for the current block (or the top level). Hooks may be async.
- [ ] `run()` returns a promise that resolves with `{ passed, failed, results }`, where `results` has one `{ name, status, error }` per test in declaration order. It never rejects because a test failed.
- [ ] Tests run sequentially. Async tests and async hooks are awaited.
- [ ] A test fails if it throws, returns a rejected promise, times out, or one of its hooks fails. `error` is the thrown or rejected value, or a timeout `Error`. Passed tests have no `error`.
- [ ] Hook order for each test: `beforeEach` from outermost to innermost, the test, then `afterEach` from innermost to outermost. Hooks from sibling blocks never run.
- [ ] If `beforeEach` fails, the test body is skipped, the test fails with that error, and `afterEach` hooks still run.
- [ ] Timeouts: a test running longer than its timeout fails with a `timed out` error, and the run moves on. The timer is cleared when a test finishes in time.

### expect
- [ ] `expect(actual).toBe(expected)` passes when `Object.is(actual, expected)`.
- [ ] `toEqual(expected)` passes for deep equality as described above.
- [ ] `toThrow(expected?)` calls `actual` (a function) and passes if it throws. With a string, the error message must contain it. With a `RegExp`, the message must match. With an error class, the error must be an `instanceof` it.
- [ ] `toContain(item)` passes when an array includes `item` (by `===`) or a string includes a substring.
- [ ] `expect(actual).not.<matcher>(…)` passes exactly when the matcher would fail, and vice versa.
- [ ] A failing matcher throws an `Error`.

### spyOn
- [ ] `spyOn(obj, method)` replaces `obj[method]` with a spy and returns it.
- [ ] By default the spy calls the original with the same `this` and arguments, and returns its result.
- [ ] `spy.calls` is an array with the arguments array of every call, in order.
- [ ] `spy.mockImplementation(fn)` replaces the behaviour, keeps recording calls, and returns the spy.
- [ ] `spy.restore()` puts the original method back on the object.

## Non-functional requirements
- No libraries, and don't use Vitest's `expect` or `vi` inside your implementation.
- **Isolation:** no module-level mutable state in the runner. Everything lives inside `createTestRunner`.
- **No leaks:** every timeout timer is cleared when its test finishes.
- **Useful failures:** matcher messages say what was expected and what was received, like `Expected 2 to be 3`.
- **Types:** keep the signatures from `types.ts`.

## Constraints
- 80 minutes.
- Export `createTestRunner`, `expect` and `spyOn` as named exports from `Solution.ts`.
- The follow-up `it.skip`, `it.only`, `describe.skip`, `describe.only` and spy matchers are declared in `types.ts`. You don't need them for the base tests.

## Data / API contract
```ts
type TestFn = () => void | Promise<void>;
type TestStatus = 'passed' | 'failed' | 'skipped';

interface TestResult { name: string; status: TestStatus; error?: unknown }
interface RunReport { passed: number; failed: number; skipped?: number; results: TestResult[] }

interface TestRunner {
  describe: { (name: string, fn: () => void): void; skip: …; only: … };
  it: { (name: string, fn: TestFn, timeoutMs?: number): void; skip: …; only: … };
  beforeEach(fn: () => void | Promise<void>): void;
  afterEach(fn: () => void | Promise<void>): void;
  run(): Promise<RunReport>;
}
function createTestRunner(options?: { timeout?: number }): TestRunner;

interface Matchers {
  toBe(expected: unknown): void;
  toEqual(expected: unknown): void;
  toThrow(expected?: string | RegExp | (new (...args: any[]) => Error)): void;
  toContain(item: unknown): void;
  toHaveBeenCalled(): void;                       // follow-up 2
  toHaveBeenCalledTimes(times: number): void;     // follow-up 2
  toHaveBeenCalledWith(...args: unknown[]): void; // follow-up 2
}
function expect(actual: unknown): Matchers & { not: Matchers };

type Spy<F> = F & { calls: Parameters<F>[]; mockImplementation(impl: F): Spy<F>; restore(): void };
function spyOn<T extends object, K extends MethodKeys<T>>(obj: T, method: K): Spy<T[K]>;
```

## Test contract
- Tests import `createTestRunner`, `expect` and `spyOn` as **named exports**. In the test file, Vitest's own `expect` checks the results, and your `expect` is always called as `impl.expect`.
- Runner tests register tests on a fresh runner, `await runner.run()`, and compare `report.passed`, `report.failed`, and each result's `name`, `status` and `error` (by identity for thrown errors).
- Hook order is checked through a shared log array.
- The timeout test uses real timers with `createTestRunner({ timeout: 30 })`, a test that never settles, and a slow test with a per-test timeout of 200ms. The timeout error must be an `Error` whose message matches `/timed out/i`.
- Matchers are checked by whether they throw: `expect(() => impl.expect(1).toBe(2)).toThrow()`.
- Follow-up tests (`npm run test:followups -- s46`):
  - **1:** `it.skip`, `describe.skip`, `it.only`, `describe.only`, `status: 'skipped'` and `report.skipped`.
  - **2:** `toHaveBeenCalled`, `toHaveBeenCalledTimes` and `toHaveBeenCalledWith` on spies (deep equality for arguments).

## Edge cases
- A `describe` with no tests, and a runner with no tests at all: `run()` resolves with `{ passed: 0, failed: 0, results: [] }`.
- A test that throws a non-`Error` value, like `throw 'oops'`.
- A test that fails by timing out but settles later: the late result must not change the report or break the next test.
- `toEqual` with `NaN`, `-0` vs `0`, nested empty arrays, and `{ a: undefined }` vs `{}`. *(Jest treats the last pair as equal; decide and say.)*
- `toThrow` on a function that throws and a `.not.toThrow('message')` whose message doesn't match.
- `spyOn` the same method twice, then restore both in the wrong order.
- Calling `it` inside a running test. *(Not supported; say how you'd report it.)*

## Follow-ups
1. **skip & only.** Add `it.skip`, `describe.skip`, `it.only` and `describe.only`. Skipped tests are reported with `status: 'skipped'` and counted in `report.skipped`. When any `.only` exists in the runner, every test that isn't marked `only` and isn't inside a `describe.only` is skipped. Why do CI setups often fail the build when a `.only` is committed?
2. **Spy matchers.** Add `toHaveBeenCalled()`, `toHaveBeenCalledTimes(n)` and `toHaveBeenCalledWith(...args)`, which compares arguments deeply against any call. How does `expect` know that `actual` is a spy?
3. **Console log history.** A Meta-style follow-up (GreatFrontEnd "Console Log History"): capture `console.log` calls made during each test into `result.logs`, and restore `console.log` afterwards, even when the test fails or times out. What goes wrong if two tests could run concurrently?
4. **`beforeAll` / `afterAll`.** Add hooks that run once per describe block. What should happen to every test in the block when `beforeAll` fails? What if the block has only skipped tests?
5. **Fake timers.** Add `runner.useFakeTimers()`, built on S42's fake clock, so tests can call `advanceTimersByTime`. Why must the runner's own timeout keep using the *real* `setTimeout`?

## Concepts covered
Registration vs execution phases · tree of suites with scoped hooks · sequential async execution · timeouts with `Promise` races and timer cleanup · deep equality · negated matchers · monkey-patching and restoring methods · reporting errors without crashing the run.

Related: S29 deepClone & deepEqual · S42 Timer utilities · S26 Promise combinators · J27 Polyfills.
