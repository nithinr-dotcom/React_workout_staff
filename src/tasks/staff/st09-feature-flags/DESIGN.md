# Feature Flag Framework: design notes

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
- Which layer owns which concern? Could the evaluation engine and client run unchanged in a Node SSR server or a React Native app?
- What exactly makes a rollout "stable"? What would break if you used `Math.random()`, or hashed only `userId`?
- Where is the single source of truth for the current snapshot, and what guarantees does `getSnapshot` make to React?
- What is your dedupe key for exposures, and where does it live? What happens to it when the user changes?
- If the flag service is down for 10 minutes, what does a user who opens the app see, and what does a user whose tab is already open see?
