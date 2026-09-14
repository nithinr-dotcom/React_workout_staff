# throttle(fn, wait) with leading/trailing

## Problem statement
Implement `throttle(fn, wait, options)`. It returns a new function that runs `fn` **at most once every `wait` milliseconds**, no matter how often it is called. Typical uses are scroll, resize and pointer-move handlers, where you want steady updates during continuous activity rather than one update at the end (that's `debounce`, J23).

By default the throttled function fires on both edges:
- **Leading edge:** the first call in a quiet period runs `fn` immediately.
- **Trailing edge:** if more calls arrive while the window is closed, `fn` runs once more when the window ends, with the arguments of the **latest** call.

The returned function also has a `cancel()` method that drops the pending trailing call.

## Clarifying questions to ask
- Are leading and trailing both on by default? *(Yes, like lodash.)*
- If several calls arrive during a window, which arguments does the trailing call use? *(The latest call's arguments and `this`.)*
- Does the trailing call start a new window? *(Yes. Every invocation of `fn` counts, so two invocations are never less than `wait` ms apart.)*
- What should the throttled function return? *(`undefined` is fine.)*
- What if both `leading` and `trailing` are `false`? *(`fn` never runs. Mention it; it isn't tested.)*

## Functional requirements
- [ ] `throttle(fn, wait)` returns a function.
- [ ] Leading edge (default): a call made when no window is open runs `fn` synchronously and opens a window of `wait` ms.
- [ ] Calls made while the window is open do not run `fn` immediately. The latest call's arguments and `this` are remembered.
- [ ] Trailing edge (default): when the window ends and a call was remembered, `fn` runs with those arguments, and a new window of `wait` ms opens.
- [ ] When the window ends and nothing was remembered, the throttle goes idle. The next call is a leading call again.
- [ ] A single isolated call runs `fn` exactly once (no duplicate trailing call).
- [ ] `{ leading: false }`: the first call in a quiet period does not run `fn` immediately; `fn` runs at the end of the window with the latest arguments.
- [ ] `{ trailing: false }`: calls made during an open window are dropped.
- [ ] `cancel()` drops any remembered call, clears timers and resets the window, so the next call behaves like a first call.
- [ ] Separate throttled functions don't share state.

## Non-functional requirements
- No libraries. Only `setTimeout`/`clearTimeout` (and optionally `Date.now`).
- Timers never leak: after `cancel()` or once the throttle goes idle, no timer is pending.
- Fully typed: the throttled function accepts the same parameters as `fn`.

## Constraints
- 30 minutes.
- Export `throttle` from `Solution.ts`. The types live in `types.ts`.
- Don't reuse your `debounce` from J23. Write it from scratch.

## Data / API contract
```ts
interface ThrottleOptions {
  leading?: boolean;   // default true
  trailing?: boolean;  // default true
}
interface Throttled<Args extends unknown[]> {
  (...args: Args): void;
  cancel(): void;
  flush(): void;       // follow-up 1
}
function throttle<Args extends unknown[]>(
  fn: (...args: Args) => void,
  wait: number,
  options?: ThrottleOptions,
): Throttled<Args>;
```

## Test contract
- Tests use `vi.useFakeTimers()` and `vi.advanceTimersByTime(ms)`. `Date.now()` is faked too, so either timers or timestamps work.
- They call `throttle` as a named export of the module.
- `vi.getTimerCount()` must be `0` after `cancel()`.
- Follow-up tests (`npm run test:followups -- j24`) check `flush()`.

## Edge cases
- A call exactly at the moment the window ends.
- `wait = 0`.
- A method on an object: `obj.onScroll = throttle(obj.onScroll, 100)` must keep `this === obj`.
- `fn` throws: the throttle should still be usable afterwards.
- Calling the throttled function from inside `fn` (re-entrancy).

## Follow-ups
1. **flush().** Add `flush()`, which runs the remembered trailing call immediately (if there is one) and resets the window. With nothing remembered it does nothing.
2. **requestAnimationFrame throttle.** Write `rafThrottle(fn)`, which runs `fn` at most once per animation frame with the latest arguments. When is this better than `throttle(fn, 16)`?
3. **Throttle via debounce.** lodash implements `throttle` as `debounce(fn, wait, { leading, trailing, maxWait: wait })`. Explain why that is equivalent.
4. **React.** Write `useThrottledCallback(fn, wait)`. It must keep the same throttled function across renders but always call the latest `fn`, and cancel on unmount.

## Concepts covered
Closures holding private state · leading vs trailing edge · `setTimeout`/`clearTimeout` · `this` forwarding with `fn.apply(this, args)` · throttle vs debounce · fake timers.

Related: J23 debounce · J25 useDebounce · S02 Autocomplete.
