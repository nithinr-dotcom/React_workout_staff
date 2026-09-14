# Hooks pack

## Problem statement
Interviewers often ask for "a quick custom hook" as a warm-up or halfway through a component round. Implement these five hooks and export each one by name from `Solution.ts`:

| Hook | What it does |
|---|---|
| `useToggle(initial?)` | A boolean with a stable `toggle` and `setValue`. |
| `usePrevious(value)` | The value from the previous render. |
| `useLocalStorage(key, initial)` | `useState` that is persisted to `localStorage` as JSON. |
| `useClickOutside(ref, handler)` | Calls `handler` when the user presses outside an element. For dropdowns and popovers. |
| `useDebounce(value, delay)` | A debounced copy of a fast-changing value. For search-as-you-type. |

The contracts are small, but each one hides a classic mistake: stale closures, listeners that never get removed, callbacks that change identity on every render, or `localStorage` reads on every render.

## Clarifying questions to ask
- Should `toggle` and `setValue` keep the same identity across renders? *(Yes, so they're safe in dependency arrays and memoised children.)*
- Does `usePrevious` return the previous **render's** value or the previous **different** value? *(The previous render's value. The other is a follow-up discussion.)*
- What happens if `localStorage` has invalid JSON, or throws (quota, private mode)? *(Fall back to `initialValue` and don't crash.)*
- Should `useLocalStorage` re-read when `key` changes? *(Nice to have. Not tested.)*
- Which event counts as "clicking outside"? *(A press: `pointerdown` or `mousedown` on `document`.)*
- If the `useClickOutside` handler changes on every render, should the listener be re-attached each time? *(No. Always call the latest handler without re-subscribing.)*

## Functional requirements
### useToggle
- [ ] Returns `[value, toggle, setValue]`. `value` starts as `initialValue` (default `false`).
- [ ] `toggle()` flips the value. Calling it twice in the same event handler flips it twice.
- [ ] `setValue(boolean)` sets the value explicitly.
- [ ] `toggle` and `setValue` have the same identity on every render.

### usePrevious
- [ ] Returns `undefined` on the first render.
- [ ] On every later render, returns the `value` that was passed on the render before.

### useLocalStorage
- [ ] On mount, reads `localStorage[key]` and parses it as JSON. If the key is missing or its value can't be parsed, uses `initialValue`.
- [ ] Reads storage only once on mount, not on every render.
- [ ] `setValue(next)` updates state and writes `JSON.stringify(next)` to `localStorage[key]`.
- [ ] `setValue(prev => next)` functional updates work, including several in a row in one handler.
- [ ] `remove()` deletes the key from storage and resets the state to `initialValue`.
- [ ] If `localStorage` throws, the hook still works as in-memory state.

### useClickOutside
- [ ] Calls `handler(event)` when a press happens on the document outside `ref.current`.
- [ ] Does not call it for presses on `ref.current` or any of its descendants.
- [ ] Does nothing while `ref.current` is `null`.
- [ ] Always calls the latest `handler`, even if it changed since the listener was attached.
- [ ] Removes its listener on unmount.

### useDebounce
- [ ] Returns the initial `value` immediately on the first render.
- [ ] When `value` changes, keeps returning the old value until `value` has stayed the same for `delay` ms, then returns the new one.
- [ ] Each change restarts the wait.
- [ ] Clears its pending timer on unmount.

## Non-functional requirements
- Hooks follow the Rules of Hooks and have honest dependency arrays. No `eslint-disable` for `exhaustive-deps`.
- No memory leaks: every listener and timer is cleaned up.
- No unnecessary re-renders or re-subscriptions (a stable `toggle`, a latest-handler ref in `useClickOutside`).
- Fully typed generics: `useLocalStorage<number[]>` gives you a `number[]` back.

## Constraints
- 45 minutes for all five. React only, no hook libraries.
- Keep the signatures in `types.ts`.

## Data / API contract
```ts
type SetStateArg<T> = T | ((prev: T) => T);

function useToggle(initialValue?: boolean): [boolean, () => void, (value: boolean) => void];
function usePrevious<T>(value: T): T | undefined;
function useLocalStorage<T>(key: string, initialValue: T): [T, (value: SetStateArg<T>) => void, () => void];
function useClickOutside<E extends HTMLElement>(ref: RefObject<E | null>, handler: (event: Event) => void): void;
function useDebounce<T>(value: T, delay: number): T;
```

## Test contract
- Hooks are imported as named exports and tested with `renderHook` and `act` from `@testing-library/react`.
- `useLocalStorage` tests read and seed `window.localStorage` directly with JSON strings. Storage is cleared between tests.
- `useClickOutside` is tested inside a small component with an inner button named `Inside` (within the ref) and a sibling button named `Outside`. Presses are simulated with `userEvent.click`, which fires `pointerdown`, `mousedown` and `click`.
- `useDebounce` tests use `vi.useFakeTimers()` and advance time inside `act`.
- Follow-up 1 dispatches a `StorageEvent('storage', { key, newValue })` on `window`.

## Edge cases
- `useLocalStorage` with a stored value of `null`, `0`, `false` or `""`. These are real values, not "missing".
- `useLocalStorage` when two components use the same key in the same tab (see follow-up 1).
- `useClickOutside` when the element is removed from the DOM on click, e.g. a menu item that closes the menu.
- `useClickOutside` for a popover rendered in a portal: the DOM is outside, but the React tree is inside.
- `useDebounce` when `delay` changes while a value is pending.

## Follow-ups
1. **Sync across tabs.** `useLocalStorage` should update when another tab changes the same key, by listening to the `storage` event. A `null` `newValue` means the key was removed, so reset to `initialValue`. How would you also sync two hooks that use the same key in the **same** tab, where `storage` doesn't fire?
2. **useSyncExternalStore.** Rewrite `useLocalStorage` using `useSyncExternalStore`. What problems does that solve compared to `useState` + `useEffect`: tearing, SSR and `getServerSnapshot`?
3. **Several refs.** Let `useClickOutside` accept an array of refs, so that pressing either a dropdown's trigger button or its popover counts as "inside".
4. **usePrevious semantics.** Implement `usePreviousDistinct(value)`, which only changes when the value actually changes. Explain why reading a ref during render conflicts with the React Compiler, and what the recommended alternative is.

## Concepts covered
Custom hooks · lazy `useState` initialisation · `useCallback` for stable identities · refs as mutable instance variables · the "latest ref" pattern · effect cleanup · `renderHook` · fake timers with React.

Related: J23 debounce · J09 Theme Toggle (persistence) · J21 Dictionary Search (useDebounce) · S02 Autocomplete.
