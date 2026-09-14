# Render Performance Audit

## Problem statement
This round is about *existing* code. `Solution.tsx` is an **Inventory Dashboard** that works correctly but is slow. It has:

- a header with a clock that ticks every second and a `Dark mode` toggle;
- a sidebar with summary numbers produced by an expensive `computeStats`;
- a filter input;
- a list of 500 rows, where clicking a row selects it.

Users report that typing in the filter lags, and the React Profiler shows the whole page lighting up every second. Your job is to **audit** it: measure, explain *why* each component re-renders, then fix it until it meets the render budgets below. Nothing the user sees may change.

Every component calls an injected `onRender(name)` in its render body, and `computeStats` reports `onRender('computeStats')` each time it runs. The tests use those calls to enforce the budgets. The Playground shows them live, next to React `<Profiler>` commit timings.

This is a staff-level task. The fix is only half of it. The other half is the reasoning: which fixes matter, which are cargo-cult `useMemo`, and how you would stop this regressing in a large codebase. Fill in `DESIGN.md`.

## Clarifying questions to ask
- Is the list size fixed? *(500 rows for the base task. 10,000 rows is follow-up 2.)*
- Can I restructure components and state, or only add memoization? *(Restructure freely. Keep the component names so `onRender` keeps reporting honestly.)*
- Must the clock stay exact to the second? *(Yes. It shows `now()` formatted as UTC `HH:MM:SS` and updates every second.)*
- Can I change the theme implementation? *(Yes, as long as `Dark mode` still toggles and the page visibly changes theme.)*
- Is the React Compiler available? *(No. Do it by hand, then discuss what the compiler would change in follow-up 3.)*
- Are libraries allowed (virtualization, state managers, selectors)? *(No.)*

## Functional requirements
Behaviour that must not change (these tests pass on the starter, so keep them green):
- [ ] The clock shows the time from `now()` as UTC `HH:MM:SS` and advances every second.
- [ ] `Dark mode` is a toggle button with `aria-pressed`, and the page switches theme.
- [ ] The sidebar (`Summary`) shows the count per category, stock value, median price and low-stock count for **all** items.
- [ ] `Filter items` filters rows by name with a case-insensitive substring match. `Showing N of M` reflects the filter.
- [ ] Clicking a row's name selects it (`aria-pressed="true"`) and deselects the previous row.

Render budgets (these tests fail on the starter):
- [ ] **Clock ticks:** 5 ticks cause **0** renders of `Row`, `ItemList`, `FilterInput` and `Sidebar`, and **0** runs of `computeStats`.
- [ ] **Typing:** one keystroke that narrows 500 rows to 176 renders `Row` **at most 10** times. Typing causes **0** `Sidebar` renders and **0** `computeStats` runs.
- [ ] **Theme:** toggling the theme twice renders `Row` **at most 10** times in total, with **0** `computeStats` runs.
- [ ] **Selection:** changing the selection from one row to another renders `Row` **at most 4** times, with **0** `Sidebar` renders and **0** `computeStats` runs.

## Non-functional requirements
- **Honest instrumentation:** every render of a component calls `onRender` with its name exactly once, and every run of `computeStats` reports once. Removing, guarding or batching those calls is cheating.
- **Explain before fixing:** for each budget, write down the re-render cause, e.g. "state lives too high", "the context value is a new object each render", or "inline props defeat `memo`". In the interview you'll narrate this.
- **Proportionate fixes:** prefer moving state down and splitting context over wrapping everything in `useMemo`. Be ready to justify each `memo`/`useMemo`/`useCallback` you add.
- **Input responsiveness:** a keystroke should commit the input's new value without waiting for the list. Aim for INP under 200ms on a mid-range laptop with 4× CPU throttling.
- **Accessibility:** keep every role, label and `aria-pressed` state.
- **Styling:** theme changes should not require re-rendering rows. Think about what the browser can do for you here.

## Constraints
- 90 minutes, including DESIGN.md notes.
- React and CSS Modules only. No libraries. No React Compiler.
- Keep `types.ts` unchanged. The Playground uses `makeItems(500)` from `data.ts`, and tests build their own 500 items.

## Data / API contract
```ts
type Category = 'Hardware' | 'Software' | 'Services' | 'Support';
interface Item { id: number; name: string; category: Category; price: number; stock: number }

type RenderName =
  | 'Dashboard' | 'Header' | 'Clock' | 'ThemeToggle' | 'Sidebar'
  | 'FilterInput' | 'ItemList' | 'Row' | 'computeStats';

interface DashboardProps {
  items: Item[];
  onRender?: (name: RenderName) => void; // called in render bodies (and once per computeStats run)
  now?: () => number;                     // defaults to Date.now
}
```
Default-export `Dashboard` from `Solution.tsx`.

## Test contract
- Tests pass a stable `onRender` that counts calls by name. They reset the counts after the first render, perform one interaction, and then assert on the counts.
- Tests render **without** `StrictMode`, so each render counts once.
- Clock tests use `vi.useFakeTimers()` with `vi.setSystemTime(2024-05-01T09:30:00Z)`, then advance 1000ms at a time. The time is found with `getByText(/09:30:05/)`.
- Test items are named `Item 001` … `Item 500`, with categories cycling through `Hardware`, `Software`, `Services`, `Support` (125 each).
- The filter is the input labelled `Filter items`. The count is the text `Showing N of M`, which tests await with `findByText`, so a deferred list update is fine.
- The list is a `list` named `Items`. Each row has a `button` named after the item, with `aria-pressed`.
- The theme toggle is a `button` named `Dark mode` with `aria-pressed`.
- The sidebar is a `complementary` region named `Summary` whose text includes `Hardware: 125`.

## Edge cases
- `now` or `onRender` passed as a new inline function on every parent render. What should your component do, and what should the docs say?
- A filter that matches nothing, then clearing it: 500 rows mount again. Where does that cost show up?
- The selected row gets filtered out, then comes back.
- `items` changes identity with the same content (e.g. after a refetch). `computeStats` will run again. Is that acceptable?
- Typing quickly: with deferred rendering, intermediate filter values may never render the list. Check the count settles on the final value.

## Follow-ups
1. **Concurrent filter.** Use `useDeferredValue` or `useTransition` so the input stays responsive even when the list render is slow (make `Row` artificially slow to prove it). Explain the difference between the two, when the deferred list shows stale results, and how you'd indicate that (for example by dimming the list while `query !== deferredQuery`).
2. **Virtualization.** The list grows to 10,000 rows. Memoization no longer helps the *first* render or clearing the filter. Virtualize the list without libraries, keep keyboard focus and `aria-setsize`/`aria-posinset` correct, and state the render budget you would now enforce.
3. **React Compiler.** The team wants to turn on the React Compiler instead of hand-memoizing. Which of your fixes would it make redundant (inline objects and callbacks, derived values, JSX memoization)? Which would it **not** fix (state living too high, one giant context value consumed everywhere, the theme passed as props, 10k DOM nodes)? What code patterns stop it from optimizing a component?
4. **Measuring in production.** Lab render counts don't prove users are faster. How would you measure this in the field? Consider `<Profiler onRender>` sampling (and why it's off in production builds by default), INP and long-animation-frame attribution with `web-vitals`, which interactions you'd tag, and how you'd set a regression budget in CI.

## Concepts covered
Why React re-renders (state, parent, context) · state colocation · splitting context by update frequency · stable context values · `React.memo` and referential equality of props · `useMemo` for expensive derived data vs premature memoization · CSS variables for theming · `useDeferredValue`/`useTransition` · React Profiler, INP and render budgets as tests.

Related: S04 Virtualized List · S50 Bug Squash · ST03 Data Grid (10k rows) · ST05 Mini Redux (selectors and subscriptions).

## Design discussion prompts
- Rank the starter's problems by user-visible impact. If you had 15 minutes instead of 90, which single change would you ship, and how would you prove it helped?
- Context vs an external store with selectors (`useSyncExternalStore`): when does splitting contexts stop scaling, and what does a selector-based store buy you?
- Where is `useMemo` harmful or pointless in this codebase? How would you review a PR that wraps every value in `useMemo`/`useCallback`?
- How would you keep render budgets from regressing across 30 teams? Think about tests like these, Profiler-based CI checks, lint rules and the React Compiler's bail-out reports.
- The clock must tick every second, but only `Clock` should care. Generalise this: how do you design a component API so that high-frequency state stays at the leaves?
- INP is poor on low-end Android even after the fixes. What is left to investigate outside React (layout thrash, long tasks, hydration, third-party scripts)?
