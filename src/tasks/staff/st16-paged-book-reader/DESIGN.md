# Paged Book Reader: design notes

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
- Where does the "which pages do I want right now" calculation live? Could it be a pure function of `(scrollTop, viewportHeight, pageHeight, pageCount, preload)`, and what would that buy you in tests?
- Draw the lifecycle of one page: idle → loading → loaded / error → evicted. Which transitions can a scroll trigger, and which can a stale response trigger?
- Cancel, debounce, or both? What does each cost the user who scrolls slowly, and the server when someone flings from page 1 to page 400?
- The cache holds 20 pages but the window can hold 7. What happens when a very tall viewport needs more pages than the cache allows? Should visible pages ever be evicted?
- Pages are fixed height here. What breaks (scroll position, jump-to-page, the spacer) when real pages have variable height, and how would you measure and correct?
