# Collaborative Text Editing (OT-lite): design notes

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
- State TP1 in one sentence. Which layer (transform, client, server) is responsible for it, and which property does a central server let you skip (TP2)?
- Draw the client state machine. Why is there at most one op in flight, and what would break if the client sent every keystroke immediately?
- Walk through the tie-break for two inserts at the same position. Where is "server history wins" encoded, and what happens if the client and server disagree on it?
- Why does an operation need to be a *list* of components? Find the concrete case where transforming a single delete produces two.
- How big does the server history grow? When can it be truncated, and what does a client that reconnects with an old revision need?
