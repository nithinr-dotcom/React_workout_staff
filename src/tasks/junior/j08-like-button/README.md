# Like Button

## Problem statement
Build the heart button that sits under a post. It shows whether you've liked the post and how many likes it has. Clicking it should feel instant, so update the UI **optimistically** before the server answers. If the request fails, put everything back the way it was and tell the user.

The network call is injected as `onToggle(liked)` so the component doesn't know about any particular API. The Playground wires it to `toggleLike` from `src/mocks/api.ts`, which fails 20% of the time.

## Clarifying questions to ask
- Should the UI wait for the server or update immediately? *(Update immediately and roll back on failure.)*
- What can the user do while a request is in flight? *(Nothing: the button is disabled until it settles. Queuing rapid clicks is a follow-up.)*
- Where does the error go? *(An inline message under the button that stays until the next click.)*
- Is the count shown? *(Yes, next to the heart, as "N likes".)*

## Functional requirements
- [ ] Render a toggle button reflecting `initialLiked`, and the count from `initialCount`.
- [ ] Clicking calls `onToggle(nextLiked)` exactly once, where `nextLiked` is the opposite of the current state.
- [ ] **Before** the promise settles: the button shows the new pressed state and the count changes by ±1.
- [ ] While the request is pending the button is disabled and shows a pending indicator (for example a spinner or "Saving…").
- [ ] On success the optimistic state is kept and the button is enabled again.
- [ ] On failure the pressed state and count roll back to what they were before the click, the button is enabled again, and an error message appears.
- [ ] The error message disappears when the user clicks again.
- [ ] The count text reads `1 like` for exactly one like, otherwise `N likes` (including `0 likes`).

## Non-functional requirements
- **Accessibility:** use a native `<button>` with `aria-pressed` ([WAI-ARIA Button pattern, toggle button](https://www.w3.org/WAI/ARIA/apg/patterns/button/)).
  - The button's name must not flip between "Like" and "Unlike": `aria-pressed` already conveys state.
  - The heart icon is decorative (`aria-hidden="true"`).
  - The error message uses `role="alert"` so it's announced.
  - Keep the pending state perceivable (for example `aria-busy="true"`).
- **Keyboard:**

  | Key | Behaviour |
  |---|---|
  | `Enter` / `Space` | Toggle (native button behaviour) |
- **UX states:** idle (not liked), liked, pending, error. Liked uses a filled red heart; not liked uses an outline.
- **No leaks:** if the component unmounts while a request is pending, don't set state afterwards.

## Constraints
- 30 minutes. React and CSS Modules only.
- Don't import the mock API in `Solution.tsx`; use the `onToggle` prop. The Playground already wires `toggleLike` from `src/mocks/api.ts`.
- Keep the public types in `types.ts` unchanged, because the tests and Playground depend on them.

## Data / API contract
```ts
interface LikeButtonProps {
  initialLiked?: boolean;                        // default false
  initialCount?: number;                         // default 0
  onToggle: (liked: boolean) => Promise<unknown>; // resolves = saved, rejects = failed
}
```
Default-export the component from `Solution.tsx`.

## Test contract
- There is exactly one `button`. Its accessible name contains `Like` (tests match `/like/i`), and it has `aria-pressed="true|false"`.
- While pending the button is `disabled`.
- The count is visible as the exact text `N likes` / `1 like` in its own element (tests use `getByText('3 likes')`).
- On failure an element with `role="alert"` appears, containing the text `Something went wrong`. It is gone (`queryByRole('alert')` is `null`) after the next click.
- Tests pass an `onToggle` mock that returns a promise they resolve or reject manually.

## Edge cases
- `onToggle` rejecting synchronously-ish (an already-rejected promise) must still roll back.
- Unliking when the count is `0` due to stale data: never show a negative count.
- The parent re-rendering with a different `initialCount` while idle. *(Assume it's ignored: `initial*` props only seed state.)*
- The component unmounting mid-request.

## Follow-ups
1. **Don't block rapid clicks.** Remove the disabled state. The user can click like → unlike → like quickly; the final UI must match the user's **last** intent, and only the latest response is allowed to decide a rollback. Explain how you ignore stale responses.
2. **Retry.** The error message includes a `Retry` button that re-sends the failed intent.
3. **`useOptimistic`.** Rewrite it with React 19's `useOptimistic` and a transition/action. What does it do for you, and what still has to be handled by hand?
4. **Shared state.** The same post is shown in the feed and in a modal at the same time. How do you keep both like buttons in sync? Compare lifting state, context, and a server-cache library.

## Concepts covered
Optimistic UI and rollback · modelling async states explicitly · `aria-pressed` toggle buttons · `role="alert"` · avoiding state updates after unmount.

Related: J01 Todo List · J20 Poll Widget · S02 Autocomplete (stale responses).
