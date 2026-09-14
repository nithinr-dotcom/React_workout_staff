# Real-time Notification Feed: design notes

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
- Draw the connection as a state machine (connecting, open, waiting to reconnect, closed by us). Which transitions does each event cause, and which timers belong to which state?
- What data structure lets you dedupe, update read state and render newest first without re-sorting everything on each flush?
- What is the path of a single message from `MessageEvent` to pixels? Count the allocations and renders along the way during a 100-message burst.
- What exactly does "resynced" mean? Which guarantees does the `lastEventTime` approach give, and which does it not?
- Which pieces can you unit test with no React at all, and which need a fake socket and fake timers?
