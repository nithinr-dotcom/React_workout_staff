# Spreadsheet with formulas: design notes

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
- What does a parsed formula need to expose besides a way to evaluate it?
- When a cell's formula changes, which edges in your graph become stale, and in which direction do you store them?
- How do you get from "A1 changed" to an ordered list of cells to recompute, without visiting the whole sheet and without recursion depth issues?
- What does a cell on a cycle look like during your traversal, and what about a cell downstream of one?
- How does a single `<Cell id="D8">` find out that its value changed, without its parent re-rendering?
