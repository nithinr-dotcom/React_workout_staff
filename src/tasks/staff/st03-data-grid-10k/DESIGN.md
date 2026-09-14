# 10k-row Data Grid: design notes

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
- What is the smallest piece of state that a scroll event needs to change, and which components actually depend on it?
- Where does the sorted order live: a sorted copy of the rows, or something smaller? What does that choice cost when the data changes?
- How do sticky header and sticky first column interact when both axes are virtualized? Which cell needs to be sticky on both?
- The active cell's DOM node can unmount. What do you store instead of an element ref, and when do you call `focus()`?
- What numbers did you record before and after each optimization, and with which tool?
