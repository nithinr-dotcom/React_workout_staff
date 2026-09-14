# 10-week study roadmap

The in-app **Roadmap** page (`/roadmap`) tracks progress against these phases. This file covers the weekly routine that goes with them.

## Daily routine (60–120 min)
1. **Warm-up (10 min):** re-implement one JS utility from memory, without the app open. Rotate through debounce, throttle, Promise.all, event emitter and LRU.
2. **Main task (45–90 min):**
   - Open the task and start the timer.
   - Spend the first 5–10 minutes writing clarifying questions and a component sketch in **Notes**.
   - Build the base version and run `npm test -- <id>`.
   - Unlock one **follow-up** and extend your code without rewriting it.
3. **Review (10 min):** press **Finish**, reveal the reference, and write "Learned from the reference" in Notes. Set your confidence honestly.
4. **Commit** your attempt (`git commit -am "j02 attempt 1"`). Your git history becomes a progress log.

## Weekly rhythm
- **Mon–Thu:** new tasks from the current phase.
- **Fri:** revisit tasks listed under **Due for revisit** on the dashboard. Reset them first: `npm run reset-task -- <id>`, then **🙈 Hide reference**.
- **Sat:** one **Mock interview** at the level above your current phase, recorded, with you talking out loud.
- **Sun:** off, or re-read your notes.

## Phases

| Weeks | Phase | Exit criteria |
|---|---|---|
| 1 | JS warm-up: J23–J28 | Write debounce, throttle, flatten and bind from memory in under 10 min each |
| 1–2 | Junior I & II: state, forms, effects, refs | Any junior task in ≤ 40 min with passing tests and correct ARIA |
| 2 | Junior III: games (optional) | — |
| 3 | Senior I: async correctness (S26–S28, S32, S33, S02, S03, S09) | Explain and prevent race conditions; cancel with AbortController without looking anything up |
| 4 | Senior II: accessible components (S01, S10, S11, S14, S15, S12) | Focus trap, roving tabindex, combobox and dialog patterns from memory |
| 5 | Senior III: trees, tables, performance | Recursive UIs and normalized state; explain when to virtualize |
| 6 | Senior IV: full apps in 90 min | Ship a working core in 60 min and use the remaining 30 for follow-ups |
| 7 | Staff I: primitives & state architecture (ST01, ST02, ST05–ST07) | Defend API shape, controlled vs uncontrolled, and render-count behaviour |
| 8 | Staff II: data-heavy UIs (ST03, ST04, ST08, ST10) | Set perf budgets and measure them (React Profiler, Performance panel) |
| 9 | Staff III: platform concerns (ST09, ST11–ST14) | A 5-minute DESIGN.md walkthrough per task, including rollout and ownership |
| 10+ | Mock interviews + revisits | Two mocks a week, and the revisit queue near zero |

## What interviewers score (use it as a checklist)
- **Requirements:** asked clarifying questions, and stated assumptions and scope.
- **Working code:** the core works end to end early; polish comes later.
- **Code quality:** sensible component boundaries, naming, no duplicated state, derived data kept derived.
- **Correctness:** edge cases, cleanup of timers and listeners, no race conditions.
- **Accessibility:** semantic HTML first, keyboard support, labels, focus management.
- **Communication:** explained tradeoffs while working and handled follow-ups gracefully.
- **Staff extras:**
  - API design for other engineers
  - performance measured, not guessed
  - testing strategy
  - migration and rollout plan
  - saying what you would *not* build

## Company notes (from interview reports)
- **Flipkart / Razorpay:** machine coding is often **vanilla JS**, 90–120 min, followed by a code review. Redo about 8 tasks without React: Accordion, Tabs, Modal, Autocomplete, Infinite Scroll, Star Rating, Progress Bars, Todo.
- **Atlassian:** one React widget round and one JS utility round, with requirements that change mid-round, so follow-ups matter.
- **Meta:** heavy on JS and DOM internals: S34, J28, S36, S26, S28.
- **Uber:** progress bars with concurrency (S09), grid lights (J16), Connect Four (S23).
- **Rippling:** concurrency runner (S27), file explorer (S05), data table (S08), transactional store (S35), form builder (ST08).
- **Intuit:** "craft demo" rounds where you extend an existing React app with tests. Practise by extending a finished reference with a follow-up.
