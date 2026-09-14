# Hooks from scratch: design notes

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
- What does one "instance" record need to hold, and how does a hook function know which instance and which slot it is being called for?
- Where do queued updates live before the re-render: on the slot, on the instance, or in a global queue? How does that choice affect batching and bail-out?
- During a render, how do you collect the effects that need to run without running them yet?
- How does `flush()` know there is nothing left to do, including work that effects scheduled while it was waiting?
- What must be reset in a `finally` block if a component throws?
