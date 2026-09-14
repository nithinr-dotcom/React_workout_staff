# debounce(fn, wait) with cancel & flush

## Problem statement
Implement `debounce(fn, wait)`. It returns a new function that delays calling `fn` until `wait` milliseconds have passed since the last call. This is the most-asked JavaScript question in frontend rounds. You'll use it again in S02 Autocomplete and J25 `useDebounce`.

The returned function also has three methods:
- `cancel()` drops the pending call.
- `flush()` runs the pending call immediately.
- `pending()` returns `true` while a call is scheduled.

## Clarifying questions to ask
- Leading edge, trailing edge, or both? *(Trailing only for the base version. Leading is a follow-up.)*
- Should `this` and the arguments of the last call be forwarded? *(Yes.)*
- What should the debounced function return? *(`undefined` is fine for the base version.)*
- What does `flush()` do when nothing is pending? *(Nothing.)*

## Functional requirements
- [ ] `debounce(fn, wait)` returns a function. Calling it schedules `fn` to run `wait` ms later.
- [ ] Each new call before the timer fires restarts the wait.
- [ ] `fn` runs with the **arguments and `this`** of the **last** call.
- [ ] `cancel()` clears the pending call. Nothing runs afterwards.
- [ ] `flush()` runs the pending call right away with the latest arguments, then clears it.
- [ ] `pending()` returns whether a call is scheduled.
- [ ] Separate debounced functions don't share state.

## Non-functional requirements
- No libraries. Only `setTimeout` and `clearTimeout`.
- Timers never leak: after `cancel`, `flush`, or the call firing, no timer is left pending.
- Fully typed: the debounced function accepts the same parameters as `fn`.

## Constraints
- 30 minutes.
- Export `debounce` from `Solution.ts`. The types live in `types.ts`.

## Data / API contract
```ts
interface Debounced<Args extends unknown[]> {
  (...args: Args): void;
  cancel(): void;
  flush(): void;
  pending(): boolean;
}
function debounce<Args extends unknown[]>(
  fn: (...args: Args) => void,
  wait: number,
  options?: { leading?: boolean; trailing?: boolean; maxWait?: number },
): Debounced<Args>;
```

## Test contract
- Tests use `vi.useFakeTimers()` and `vi.advanceTimersByTime(ms)`.
- They call `debounce` as a named export of the module.
- Follow-up tests (`npm run test:followups -- j23`) check the `leading`, `trailing: false` and `maxWait` options.

## Edge cases
- `wait = 0` still defers the call to a macrotask; it doesn't run synchronously.
- Calling the debounced function inside `fn` (re-entrancy).
- `flush()` called twice in a row runs `fn` only once.
- A method on an object: `obj.save = debounce(obj.save, 100)` must keep `this === obj`.

## Follow-ups
1. **Leading edge.** Support `{ leading: true }`: call immediately on the first call, then ignore calls until `wait` ms of quiet. With `{ leading: true, trailing: true }`, a burst of several calls runs once at the start and once at the end. A burst of exactly one call runs only once.
2. **maxWait.** Support `{ maxWait }`, so that during continuous calls `fn` still runs at least every `maxWait` ms. For example, save a draft while the user keeps typing. How does this relate to `throttle`?
3. **Return value.** Make the debounced function return the result of the last `fn` call, as lodash does. Explain why this value is often stale.
4. **React.** Explain why `const onChange = debounce(save, 300)` inside a component body is a bug. Show two correct ways to fix it.

## Concepts covered
Closures holding private state · `setTimeout`/`clearTimeout` · `this` forwarding with `fn.apply(this, args)` · functions with attached methods · fake timers.

Related: J24 throttle · J25 useDebounce · S02 Autocomplete.
