# Mini React Query: design notes

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
- What are the separate objects in your design (client, cache entry, observer)? Which one holds the in-flight promise, and which one holds the options?
- `queryFn` and `queryKey` are new on every render. Which values does your hook treat as identity, and which ones does it just read "latest"?
- What does `getSnapshot` return, and how do you keep it referentially stable between notifications?
- When exactly is data considered stale: when it is read, when an observer mounts, or on a timer? What does each choice cost?
- Where would a web worker, `BroadcastChannel` or `localStorage` persistence plug in without changing the hook API?
