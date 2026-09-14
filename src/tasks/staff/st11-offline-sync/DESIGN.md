# Offline-first Sync (todos): design notes

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
- What is the unit stored in your outbox: a whole-document snapshot or a diff? How does that choice affect coalescing, replay and conflicts?
- Draw the lifecycle of one todo's `status` as a state machine. Which events move it between `pending`, `synced`, `failed` and `conflict`, and what happens when a new local edit arrives mid-request?
- What's the invariant between the persisted outbox and the persisted todos? In what order do you write them, and why?
- What guarantees that the replay loop runs at most once at a time, even when the network flaps or `retry()` is clicked twice?
- What would you need to change if the server API were not idempotent (for example, `POST /todos` creating a new id)?
