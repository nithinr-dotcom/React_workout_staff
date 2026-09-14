# Error Boundary + Observability Layer: design notes

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
- Which lifecycle method gives you the component stack, and which one decides what to render? Why does React split them?
- How do you detect a `resetKeys` change *only while in the error state* without resetting on every re-render?
- When exactly does the flush timer start and stop? What happens to the timer when a size-triggered flush empties the buffer first?
- Where in the pipeline do you scrub: when an event is enqueued, or when it is sent? How does that choice interact with dedupe and with how long PII sits in memory?
- What stops the SDK from reporting its own failures in a loop?
