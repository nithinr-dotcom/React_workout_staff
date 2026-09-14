# i18n Library: design notes

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
- A plural branch can contain `{name}` placeholders. What does that imply about scanning braces with a regex, compared with tracking depth?
- What is the single source of truth for "which locale is showing": the locale that was requested, or the locale whose catalog is loaded? How does your answer prevent flashes and races?
- What does a component subscribe to, and what value does `useSyncExternalStore` compare, so that background loads don't re-render everyone?
- Where do you cache `Intl.PluralRules` and `Intl.NumberFormat` instances, and what is the cache key?
- Who is allowed to touch `document.documentElement`? What happens with two providers, or a provider inside a portal or iframe?
