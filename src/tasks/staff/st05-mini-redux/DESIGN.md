# Mini Redux + useSyncExternalStore + selectors: design notes

> Fill this in after (or while) coding. In the interview you'll have ~5 minutes to walk through it.

## 1. Requirements & scope
- Functional:
- Non-functional (perf budgets, a11y, i18n, browser support):
- Explicitly out of scope:

## 2. Public API
_Props / hooks / functions consumers use. Show a usage example. Why this shape?_

## 3. Architecture
_Component/module diagram, data flow, where state lives, why._

## 4. Key tradeoffs
| Decision | Options considered | Chosen | Why |
|---|---|---|---|

## 5. Performance
_What is expensive? How did you measure? Memoization, virtualization, workers, batching._

## 6. Accessibility

## 7. Failure modes & edge cases

## 8. Testing strategy
_Unit vs integration vs e2e; what you'd test and what you wouldn't._

## 9. Rollout & ownership
_Migration path, versioning, docs, how other teams adopt it, metrics you'd watch._

## Hints for this task
- What exactly does your `getSnapshot` return, and what happens if it returns a new object on every call?
- Where does the "previous selected value" live, and when is it allowed to update: during render, or only after commit?
- Does the Provider put the store itself in context, or the state? What does each choice do to re-renders?
- Is `compose(a, b, c)(dispatch)` left to right or right to left? Why does the middleware API's `dispatch` have to be a late-bound wrapper?
- Which invariants would you enforce in development builds only, and how would you strip them from production?
