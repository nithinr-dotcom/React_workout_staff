# Plugin Architecture / Micro-frontend Shell: design notes

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
- Everything a plugin does goes through `ctx`. If you tracked every side effect per plugin as a disposable, what would `deactivate` and failure rollback look like?
- What exactly is the snapshot for `useSyncExternalStore` here, and when must its identity change?
- Where does the lazy "activation in flight" state live, so that two concurrent `activate` calls share one load, and so that a `deactivate` during loading wins?
- An error boundary sits around each panel. How does the boundary know which plugin to blame, and how does it reset when the plugin is re-activated?
- What would the contract look like if plugins ran in an iframe tomorrow? Which parts of your current API would you regret?
