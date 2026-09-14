# Toast Notification System

## Problem statement
Design and build a toast notification system for an app. Any component deep in the tree should be able to write:

```tsx
const toast = useToast();
toast.show({ message: 'Saved', type: 'success' });
```

Wrap the app once in `<ToastProvider>`. Toasts appear stacked in a corner, disappear on their own after a while, pause while hovered, and can be closed by hand. Only a limited number are on screen at once; the rest wait their turn. Screen-reader users must hear them.

The interviewer cares as much about the **API shape** and **timer bookkeeping** as the visuals.

## Clarifying questions to ask
- How does code show a toast: a hook, a global function, or an event bus? *(A `useToast()` hook backed by context. A non-React `toast()` function is a follow-up.)*
- Where do toasts render? *(In a portal attached to `document.body`, bottom-right.)*
- What happens when more toasts arrive than fit on screen? *(Show the first `maxVisible` in arrival order. Queue the rest FIFO. A queued toast appears when a visible one leaves.)*
- When does a queued toast's timer start? *(When it becomes visible, not when `show` was called.)*
- Does hovering pause just that toast or all of them? *(Just the hovered toast. Leaving resumes it with the time it had left, not a fresh full duration.)*
- Can a toast be sticky? *(Yes, `duration: 0` never auto-dismisses.)*
- Exit animations? *(Not required. A dismissed toast leaves the DOM immediately.)*

## Functional requirements
- [ ] `ToastProvider` renders its `children` plus a toast container in a portal attached to `document.body`.
- [ ] `useToast()` returns `{ show, dismiss }`. Both functions keep the same identity across renders.
- [ ] `useToast()` used outside a provider throws an `Error` with a helpful message.
- [ ] `show({ message, type = 'info', duration })` displays a toast and returns a unique string id. `duration` defaults to the provider's `defaultDuration` (5000 ms).
- [ ] Each toast shows its message and a close button. Clicking the close button removes it.
- [ ] `dismiss(id)` removes a visible or queued toast. Unknown ids do nothing.
- [ ] A toast auto-dismisses `duration` ms after it becomes visible. `duration: 0` means it never auto-dismisses.
- [ ] While the pointer is over a toast, its timer is paused. On pointer leave it resumes with the **remaining** time.
- [ ] At most `maxVisible` (default 3) toasts are visible. Extra toasts wait in a FIFO queue and appear, in order, as visible ones are removed.
- [ ] Toasts are visually distinguishable by type (colour and an icon or label).

## Non-functional requirements
- **Accessibility:**
  - The container is always rendered while the provider is mounted, as `role="region"` with `aria-label="Notifications"` and `aria-live="polite"`. A live region must exist *before* content is added to it, or screen readers may not announce the content.
  - Each non-error toast has `role="status"`. Error toasts have `role="alert"` so they are announced assertively.
  - The close button is a real `<button>` with the accessible name `Dismiss`.
  - Toasts must not steal focus.
- **Keyboard:**

  | Key | Behaviour |
  |---|---|
  | `Tab` | The close buttons are reachable in normal tab order |
  | `Enter` / `Space` on `Dismiss` | Remove that toast (native button behaviour) |
- **Timers:** no timer outlives its toast. Unmounting the provider clears every timer. A toast dismissed by hand never fires a stale timeout later.
- **Rendering:** calling `show` must not re-render the whole app. Consumers of `useToast()` should not re-render when the toast list changes. Think about what goes in context.
- **Motion:** if you animate, respect `prefers-reduced-motion`.

## Constraints
- 75 minutes. React and CSS Modules only. No toast or animation libraries.
- Keep the public types in `types.ts` unchanged.

## Data / API contract
```ts
type ToastType = 'info' | 'success' | 'warning' | 'error';
interface ToastOptions { message: string; type?: ToastType; duration?: number } // duration 0 = sticky
interface ToastApi { show(options: ToastOptions): string; dismiss(id: string): void }
interface ToastProviderProps {
  children?: ReactNode;
  maxVisible?: number;      // default 3
  defaultDuration?: number; // default 5000
}
// Solution.tsx exports:
export function ToastProvider(props: ToastProviderProps): ReactNode;
export function useToast(): ToastApi;
export default ToastProvider;
```

## Test contract
- Tests import `ToastProvider` and `useToast` as **named exports**.
- The container is a `region` named `Notifications` with `aria-live="polite"`, inside `document.body` but outside the render container.
- Visible toasts are found with `getAllByRole('status')` (and `getByRole('alert')` for errors). Each contains its `message` text.
- Each toast contains a `button` named `Dismiss`.
- Queued toasts are **not** in the DOM.
- Dismissed toasts leave the DOM immediately (no exit animation in the test path).
- Tests use `vi.useFakeTimers({ shouldAdvanceTime: true })`, `act(() => vi.advanceTimersByTime(ms))`, and `user.hover` / `user.unhover` on the toast element (the element with role `status`).

## Edge cases
- `show` called many times in the same tick: ids stay unique and order is preserved.
- `dismiss` on a queued toast: it never appears.
- Hover, then the toast is dismissed with the button while paused.
- A toast becomes visible while the pointer is already over the stack.
- `maxVisible` smaller than the number already visible after a prop change.
- The provider unmounts with pending timers (no "state update on unmounted component" and no leaks).
- Two providers nested: `useToast` talks to the nearest one.

## Follow-ups
1. **Imperative API outside React.** Support `toast.success('Saved')` from a plain module (e.g. an API client interceptor) without a hook. How do you connect it to the mounted provider, and what happens if nothing is mounted?
2. **Update and promise toasts.** Add `update(id, options)` and `toast.promise(promise, { loading, success, error })` that shows one toast which changes as the promise settles.
3. **Deduplication.** Showing the same message twice within a short window bumps a counter ("Saved ×3") and restarts the timer instead of stacking duplicates.
4. **Animations.** Slide in and out. The exit animation must finish before the toast unmounts and before the next queued toast takes its place, while the tests' "removed from the accessibility tree immediately" guarantee still holds.
5. **Pause on window blur and focus.** Pause every timer when the tab is hidden (`visibilitychange`) and when a close button has keyboard focus, as WCAG 2.2.1 (Timing Adjustable) suggests.

## Concepts covered
Context + custom hook API design · splitting state and dispatch contexts to avoid re-renders · portals · timers with pause and remaining time · FIFO queue · `aria-live`, `role="status"` vs `role="alert"` · cleanup on unmount.

Related: S01 Modal Dialog · S09 Progress Bars Queue · J23 debounce.
