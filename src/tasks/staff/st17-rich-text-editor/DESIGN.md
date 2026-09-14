# Rich Text Editor (model-driven): design notes

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
- Draw the loop: DOM event → command → new model → render → DOM selection. Which step is the only one allowed to touch the DOM, and what happens if the browser mutates it anyway (spellcheck, IME, extensions)?
- Why is "runs with marks" easier to edit than a tree of `<strong><em>` nodes? Which normalization invariant makes `toEqual` on documents meaningful?
- Where do stored marks live, and when are they cleared? Walk through "Ctrl+B, type, click elsewhere, type".
- What exactly is your undo grouping rule? What does a user expect after typing a sentence, pausing, then pressing Ctrl+Z twice?
- Paste is an attack surface. Why is an allow-list parser into the model safer than stripping bad tags from an HTML string?
