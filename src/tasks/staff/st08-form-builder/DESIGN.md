# Schema-driven Form Builder: design notes

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
- How do you address a value deep inside a group inside an array item? Can the same address serve as the key for errors, touched state and element ids?
- Which pieces are pure functions of `(schema, values)` (defaults, visibility, payload, required checks) that you could write and test without React?
- For an array item, what is its React `key`? What breaks if it is the index and items have async validators or local state?
- Where do debounce timers and "latest request" tokens live so they survive re-renders and are cleaned up on unmount?
- What exactly does a custom field renderer own, and what does the builder keep owning so that accessibility can't be forgotten?
