# Render Performance Audit: design notes

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
- Make an audit table before touching code. For each interaction (tick, keystroke, theme toggle, row click), list which components render, the before-and-after counts, and the *cause* of each render (state, parent, or context).
- For every piece of state, ask who actually needs it and how often it changes. What happens when high-frequency and low-frequency values share one context value?
- `memo` compares props with `Object.is`. List every prop and context `Row` receives in the starter, and which of them get a new identity on each render.
- Which of your fixes would still be needed if the React Compiler were on? Which would become noise?
- How would you tell a product manager this is "fixed"? Name the metric, the device class and the threshold.
