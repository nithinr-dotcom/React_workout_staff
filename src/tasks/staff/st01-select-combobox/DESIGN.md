# Design-system Select / Combobox: design notes

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
- How do the parts share state, and which of that state changes often? Would splitting the context help?
- How does an option discover its position in the list when it may be nested inside arbitrary wrappers, and what happens when options re-order?
- What single piece of logic lets controlled and uncontrolled modes share one code path?
- Where does the typeahead buffer live, and what resets it?
- What in your implementation would change if focus had to move into the listbox instead of using `aria-activedescendant`?
