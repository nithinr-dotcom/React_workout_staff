# Task authoring guide

Every task lives in `src/tasks/<level>/<id>/`. The app finds it automatically. Use `npm run new-task` to scaffold one and `npm run check-tasks` to validate.

The two hand-written examples are the source of truth for style:
- **UI task:** `src/tasks/junior/j02-accordion/`
- **JS task:** `src/tasks/junior/j23-debounce/`

## Files

| File | Required | Purpose |
|---|---|---|
| `meta.ts` | ✅ | `TaskMeta` default export (see `src/lib/types.ts`). `id` must equal the folder name. `code` must match the folder prefix (`j02` → `J02`). |
| `README.md` | ✅ | The full spec, with exactly the headings listed below. |
| `types.ts` | ✅ | The public contract: props for UI tasks, a module interface for JS/hook tasks. The Solution, Reference, Playground and tests all import from it. |
| `Solution.tsx` / `Solution.ts` | ✅ | **The user's blank starter.** It must `export const NOT_STARTED = true;` with the standard comment. It must compile, and it must not contain the answer. |
| `Solution.module.css` | UI tasks | Contains only `.root {\n}` |
| `Reference.tsx` / `Reference.ts` | ✅ | Either a full solution or the placeholder (see below). Its styles go in `Reference.module.css`, never the Solution's CSS. |
| `Playground.tsx` | when props or a demo are needed | `export default function Playground({ impl }: { impl: ... })`. It renders `impl.default` (UI) or exercises `impl.someFn` (JS/hooks) with realistic demo data. The same Playground renders both the Solution and the Reference. |
| `task.test.tsx` | ✅ | Acceptance tests, using `pickTarget`. |
| `DESIGN.md` | Staff tasks | A design write-up template for the user to fill in. |

### Solution starter (UI)
```tsx
import type { FooProps } from './types';
import styles from './Solution.module.css';

// ⬇ Delete this line when you start. Tests for this task are skipped while it exists.
export const NOT_STARTED = true;

export default function Foo({ a, b }: FooProps) {
  // Your implementation here. Requirements are in README.md.
  void a;
  void b;
  return <div className={styles.root}>Foo: start coding in Solution.tsx</div>;
}
```

### Solution starter (JS / hook)
Export every function named in `types.ts`. Each one has the full signature and a body of `throw new Error('<name>: not implemented')`. For hooks the stub also throws.

### Reference placeholder
```tsx
// Reference solution not written yet.
export const NOT_IMPLEMENTED = true;
export default function Reference() {
  return null;
}
```
For `.ts` references, omit the default export. For JS tasks that have a Playground, the placeholder may also export stub functions so the types line up, but that's not required.

## README headings (in this order, exact text)
```
# <Title>
## Problem statement
## Clarifying questions to ask
## Functional requirements        ← GitHub task list "- [ ]"
## Non-functional requirements    ← accessibility (APG pattern + keyboard table), performance, UX states
## Constraints                    ← time box, no libraries, which mock API
## Data / API contract            ← ts code block matching types.ts
## Test contract                  ← exact roles / labels / texts the tests rely on
## Edge cases
## Follow-ups                     ← numbered list, "1. **Title.** description"; hidden in the UI until unlocked
## Concepts covered               ← plus "Related: J03 Tabs · …"
## Design discussion prompts      ← staff only, after Concepts covered
```
Follow-ups must be a numbered list. The app's parser treats every `1.` line as a new item, and indented lines belong to the previous item.

Write for someone who is sharp but out of practice. Be precise about behaviour and never give away the implementation. Clarifying questions include the assumed answer in *(italics)*.

## Tests
```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { pickTarget } from '../../../test/target';
import * as Reference from './Reference';
import * as Solution from './Solution';

const { impl, describeTask, describeFollowUp } = pickTarget(Solution, Reference);
const Foo = impl.default;

describeTask('Foo', () => { /* base requirements */ });
describeFollowUp(1, 'controlled mode', () => { /* optional: follow-up 1 */ });
```
**Rules:**
- **Query like a user.** Use `getByRole`, `getByLabelText` and `getByText` with the names written in the README's Test contract. Never query class names, test ids or component internals.
- **Test behaviour, not structure.** Any reasonable correct implementation must pass.
- **Timers:** use `vi.useFakeTimers({ shouldAdvanceTime: true })` together with `userEvent.setup({ advanceTimers: vi.advanceTimersByTime })`, or plain `vi.advanceTimersByTime` for JS tasks. Wrap React state updates caused by timers in `act`.
- **Async mocks:** tests stub `src/mocks/api.ts` with `vi.mock('../../../mocks/api', …)` or `vi.spyOn`, so tests run fast and deterministically. Pass `latency: 0` where a task allows injecting options.
- **Hooks:** test them with `renderHook` from `@testing-library/react`.
- **Unverified tests:** if the Reference is a placeholder, put this comment at the top of the test file: `// ⚠ Unverified: written before the reference solution. If a test looks wrong, trust the README.`
- Aim for 6–12 focused tests covering the functional requirements and the most important edge cases.

## Mocks available
- **`src/mocks/api.ts`:** every call takes `(…, { signal, latency, failRate })`. Available calls:
  - search and lookups: `searchCountries`, `getCountries`, `lookupWord`, `getWeather`
  - pagination and lists: `getFeed` (cursor), `getUsers` (offset, sort, filter), `getAllUsers`, `getProducts`
  - writes: `saveUser`, `deleteUser`, `toggleLike` (20% failure by default), `getTodos`, `saveTodo`, `deleteTodo`
  - trees and jobs: `getComments`, `getFileTree`, `getJobIds`, `getJob`
  - errors: `ApiError`
- **`src/mocks/mockSocket.ts`:** `new MockSocket('chat' | 'notifications', { intervalMs, burstEvery, burstSize })`. It fires `open`, `message` (JSON string data) and `close` events, and has `send`, `close` and `simulateDrop`.
- **`src/mocks/data/datasets.ts`:** exports `COUNTRIES`, `USERS`, `PRODUCTS`, `COMMENTS`, `FILE_TREE`, `POSTS`, `JOBS`, `WORDS`, `DICTIONARY` and `WEATHER`.

Import these from task files with `../../../mocks/api`.

## DESIGN.md template (staff)
```md
# <Title>: design notes

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
```
Each staff task's DESIGN.md starts from this template, followed by 3–5 task-specific prompts under "Hints for this task".
