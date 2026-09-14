# Bug Squash: fix a broken React app

## Problem statement
This round is about *existing* code, not a blank file. A teammate shipped a small **Team Directory** app last sprint. It has a debounced search box, a list of people with a favourite checkbox on each row, a profile panel that loads the selected person through an injected `api`, a form to add a guest, and an "Online for Ns" counter in the header.

QA has filed seven bug tickets against it. `Solution.tsx` **is** that app. It is deliberately broken.

Your job, in 60 minutes:
1. Read the code and get oriented. Say out loud what each part does before you change anything.
2. For each ticket, reproduce it, find the **root cause**, and make the smallest fix that solves it properly.
3. Explain each cause as you go. In the real round (Stripe "Bug Squash", Intuit Craft Demo, Atlassian's Karat debugging) the interviewer grades your debugging process as much as the fix.

Delete the `NOT_STARTED` line first. All seven ticket tests fail against the code as shipped.

## Clarifying questions to ask
- Can I restructure the code, or only patch it? *(Patch it. Small, targeted fixes. Extracting a helper or lifting state is fine. A rewrite is not.)*
- Can I change the visible labels or texts? *(No. QA's tests and the Playground rely on them.)*
- Are the bugs only in `Solution.tsx`? *(Yes. `types.ts` and `data.ts` are correct.)*
- Is it OK to add dependencies, e.g. a data-fetching library? *(No. React only.)*
- Should I fix things that aren't ticketed if I spot them? *(Mention them. Fix them only if they are cheap and safe, and tell the interviewer.)*
- Do favourites need to persist anywhere? *(Not for the base task. Rows only need to remember them while the app is open. Persisting is follow-up 2.)*

## Functional requirements
Each ticket is written the way QA reported it: symptoms and repro steps only. Tick it off once your fix makes its test pass **and** you can explain why the bug happened.

- [ ] **BUG-1: "Online for" counter is frozen.** Open the app and wait. The header says `Online for 1s` and never goes higher.
- [ ] **BUG-2: Profile panel shows the wrong person.** Click *Ada Lovelace*, and her profile loads. Then click *Grace Hopper*. The row highlight moves to Grace, but the panel keeps showing Ada's email and location.
- [ ] **BUG-3: Profile flips back to someone I didn't pick.** *(Reproduce this once BUG-2 is fixed.)* On a slow network, click *Ada Lovelace* and then quickly click *Grace Hopper*. Grace's profile appears, and a moment later the panel silently switches to Ada, even though Grace is still selected. In the Playground, Ada's profile takes 2s and everyone else's takes 300ms.
- [ ] **BUG-4: Favourite star jumps to another person.** Tick the favourite checkbox for *Grace Hopper* (second row). Search for `gr`. Grace is now the only row and her checkbox is **unticked**. Clear the search and a different person's box may now be ticked.
- [ ] **BUG-5: Added guest doesn't show up.** Type a name into *Guest name* and press *Add guest*. The input clears, but nobody new appears in the list. The guest only appears later, after something else changes (for example after typing in the search box).
- [ ] **BUG-6: "Showing N of M" is wrong.** With 4 people loaded it correctly says `Showing 4 of 4`. Search for `gr` and one row is left, but it still says `Showing 4 of 4`.
- [ ] **BUG-7: The directory leaks after it is closed.** Press Escape while a profile is open, and the panel closes, as designed. But every time the directory is unmounted and mounted again (use the Playground's buttons), memory snapshots show one more retained copy of the component's handlers, and Escape runs directory code even when the directory isn't on screen.

### Hints (reveal one at a time)
Try each ticket for at least five minutes before opening its hint. Each hint is a nudge, not the fix.

<details><summary>BUG-1 hint</summary>What value of <code>seconds</code> does the interval callback see on its 2nd, 3rd and 10th run? When was that function created? There are two common fixes, and one of them doesn't need the effect to re-run.</details>

<details><summary>BUG-2 hint</summary>When the selection changes, the panel component stays mounted. What decides whether an effect runs again? Also ask why someone silenced the linter on that line.</details>

<details><summary>BUG-3 hint</summary>Two requests are in flight and they can finish in any order. When a response arrives, how does the code know whether it is still the one the user wants? Think about what an effect's cleanup function is for. Compare "ignore the stale response" with "cancel the request".</details>

<details><summary>BUG-4 hint</summary>Which piece of state holds the tick, and which component owns it? When the filtered list changes, how does React decide which existing row component to reuse for which person?</details>

<details><summary>BUG-5 hint</summary>Compare the array you pass to the state setter with the array React already has. How does React decide whether a state update is a change worth re-rendering for? Why does an unrelated update make the guest appear?</details>

<details><summary>BUG-6 hint</summary>The count is stored in its own piece of state. List every place that updates it, then every event that should change it. Does it need to be state at all?</details>

<details><summary>BUG-7 hint</summary>Look for anything the component subscribes to outside React's tree. For each one, find the code that unsubscribes. What should an effect return?</details>

## Non-functional requirements
- **Minimal diffs:** each fix should be a few lines. If one ticket needs a large change, stop and explain why first.
- **No regressions:** debounced search, the Escape shortcut, loading and error states in the profile panel, and "No people match your search." must still work.
- **Lint:** don't silence `react-hooks/exhaustive-deps`. If a suppression comment is hiding a real problem, remove the suppression and fix the problem.
- **Accessibility:** keep the existing labels. The profile panel stays a labelled region, and rows keep `aria-pressed` on the name button.
- **Process (graded in the real round):** reproduce first, form a hypothesis, confirm it (a log, a breakpoint or a test), fix, then re-run. Narrate as you go.

## Constraints
- 60 minutes for all seven tickets. Plan roughly 7 minutes per ticket plus orientation time.
- React and CSS Modules only. No new dependencies.
- Keep `types.ts` and every visible label and text unchanged.
- The Playground uses the fake API in `data.ts` (`createFakeApi`). Tests inject their own fake `api`.

## Data / API contract
```ts
interface Member { id: string; name: string; title: string }
interface MemberProfile extends Member { email: string; location: string }

interface DirectoryApi {
  listMembers(): Promise<Member[]>;
  getMember(id: string): Promise<MemberProfile>;
  setFavourite?(id: string, favourite: boolean): Promise<void>; // follow-up 2 only
}

interface TeamDirectoryProps { api: DirectoryApi }
```
Default-export the component from `Solution.tsx`.

## Test contract
- The header shows the text `Online for Ns` (e.g. `Online for 3s`). Tests use fake timers and advance them 1000ms at a time.
- The search box has the label `Search people`, and filtering waits for a 300ms debounce. Matching is a case-insensitive substring match on `name`.
- Each row has a `checkbox` named `Favourite <name>` and a `button` named `<name>` that selects the person.
- The count is the text `Showing <visible> of <total>`.
- The profile panel is a `region` named `Profile`. Its email text appears once the profile loads.
- The guest form has an input labelled `Guest name` and a `button` named `Add guest`. After adding, the new person has a row button with their name and the input is empty.
- Pressing `Escape` (dispatched on `document.body`, bubbling to `document` and `window`) closes the profile panel.
- **BUG-7** is checked with spies on `window`/`document` `addEventListener` and `removeEventListener`. After unmount, every `keydown` listener the app added must have been removed, or registered with an `AbortSignal` that is now aborted.
- **BUG-3** uses a fake `getMember` whose promises the test resolves by hand, in reverse order.

## Edge cases
- Selecting the same person twice, or closing the panel while a profile is still loading.
- A guest has no profile on the server, so the panel must show `Could not load profile.` rather than crash.
- Clearing the search after favouriting, with rows reappearing in their original order.
- React StrictMode mounts, unmounts and remounts effects in development. Each of your fixes must survive that.
- Two guests with the same name.

## Follow-ups
1. **Add a sort option.** Add a `Sort by` select with the options `Default order`, `Name (A–Z)` and `Name (Z–A)`. Sorting must not reset favourites or the selection. Watch out for sorting the state array itself.
2. **Optimistic favourite with rollback.** Favouriting calls `api.setFavourite(id, next)`. The checkbox updates immediately. If the call rejects, revert just that row and show an `alert` containing `Could not save favourite`. Consider what happens when the user toggles the same row twice before the first request finishes.
3. **Regression test for BUG-3.** Write a test that fails on the original code and passes on yours, with no real timers or network. Explain how you control the order in which the promises resolve, and why the test is written against behaviour rather than against an "ignore" flag.
4. **Cancel, don't just ignore.** Change `getMember` to accept `{ signal }` and abort stale requests. When is aborting better than ignoring, and what does the UI need to do with an `AbortError`?
5. **Prevent the whole class of bugs.** Which of the seven would a linter, TypeScript, StrictMode, or a custom hook (`useInterval`, `useEventListener`, `useQuery`) have caught or prevented? What would you add to the team's codebase so they don't come back?

## Concepts covered
Debugging an unfamiliar codebase · stale closures and functional updates · effect dependencies and why suppressing the lint rule is dangerous · async race conditions (ignore flags, `AbortController`) · keys and component identity · immutable state updates and `Object.is` bail-outs · derived state vs stored state · effect cleanup for listeners and timers.

Related: S21 Users Directory CRUD · S33 useFetch · J23 Debounce · ST15 Render Performance Audit.
