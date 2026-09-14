# Popover / Tooltip positioning primitive: design notes

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
- If flip, shift and arrow were separate "middleware" steps, what would each one take in and return, and does their order matter?
- Why ref callbacks instead of `useRef` objects? What happens when the anchor element changes identity?
- Which events can invalidate a computed position, and which of them can you observe without polling?
- What does a consumer see on the very first frame after `open` becomes true, and how do you make sure it's never wrong?
- How does `Tooltip` stay out of the way of a child that already has its own `ref`, handlers and `aria-describedby`?
