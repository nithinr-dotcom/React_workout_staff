# 12-week study roadmap

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
| 1 | JS warm-up: J23, J24, J26, J27, J44, J30, J31, J28 | Write debounce, throttle, flatten, bind, `new` and groupBy from memory in under 10 min each |
| 1–2 | Junior I & II: state, forms, effects, refs | Any junior task in ≤ 40 min with passing tests and correct ARIA |
| 2 | Junior III: games (optional) | — |
| 3 | Senior I: async correctness (S37, S26–S28, S32, S39–S43, S33, S02, S03, S09) | Write a Promise from scratch; explain and prevent race conditions; cancel with AbortController without looking anything up |
| 4 | Senior II: accessible components (S01, S10, S11, S14, S15, S12, S57, S59) | Focus trap, roving tabindex, combobox and dialog patterns from memory |
| 5 | Senior III: trees, tables, layout, performance | Recursive UIs and normalized state; explain when to virtualize; lay out overlapping calendar events |
| 6 | Senior IV: JS and DOM internals (S29–S31, S34–S36, S38, S44–S49) | JSON parser, `produce()` and Observable without notes |
| 7 | Senior V & VI: full apps + debug an existing app (S17–S21, S54–S56, S58, S60, S50) | Ship a working core in 60 min and use the remaining 30 for follow-ups; fix all 7 bugs in S50 in 60 min |
| 8 | Staff I: primitives & state architecture (ST01, ST02, ST05–ST07) | Defend API shape, controlled vs uncontrolled, and render-count behaviour |
| 9 | Staff II: data-heavy UIs (ST15, ST03, ST04, ST08, ST10, ST16) | Set perf budgets and measure them (React Profiler, Performance panel) |
| 10 | Staff III: platform concerns (ST09, ST11–ST14) | A 5-minute DESIGN.md walkthrough per task, including rollout and ownership |
| 11 | Staff IV: editors & collaboration (ST17, ST18) | Explain model-vs-DOM editors and why OT/CRDT converge |
| 12+ | Mock interviews + revisits | Two mocks a week, and the revisit queue near zero |

## Round formats to rehearse
The same task can be asked in very different formats. Before applying, practise each format at least twice:

| Format | Who runs it | How to practise here |
|---|---|---|
| **Vanilla JS only** (90–180 min, no React) | Flipkart UI1/UI2, Microsoft, Walmart (Karat), Booking.com, Amazon, Salesforce, Atlassian's first round | Redo about 8 solved tasks in a plain `index.html` + JS file: J02, J03, J04, J11, J12, S01, S02, S03, S09, S54. Use `document.createElement`, event delegation and `<template>`. |
| **Code review of your own submission**, with new requirements added | Flipkart UI2, Microsoft, Media.net | After finishing a task, wait a day, then read your code as a reviewer: naming, component boundaries, duplicated state, missing cleanup. Then unlock a follow-up and extend without rewriting. |
| **Debug / extend an existing codebase** | Stripe "Bug Squash" and "Integration", Intuit "Craft Demo", Atlassian (Karat) | S50 Bug Squash, ST15 Render Performance Audit. Also extend another task's finished Reference with one of its follow-ups. |
| **Write tests** for a component | Atlassian (JS round with unit tests), Coinbase (about 6 tests for an existing app) | S46 Mini test runner. For any solved task, write your own `mytests.test.tsx` before opening `task.test.tsx`, then compare coverage. |
| **Match a mock pixel-for-pixel / CSS-heavy** | Coinbase (marked down for CSS), Airbnb (poker-card dealing in CSS), Dropbox (homepage from a spec), Flipkart (image rows with flexbox), Swiggy (responsive grid) | J34 Holy Grail, J33 Navbar, S52 Masonry. Pick a real page (Swiggy restaurant card, Flipkart product tile) and rebuild it in 45 min with no framework. |
| **Pair programming with hints** | Razorpay, Atlassian | Talk out loud during mocks; treat unlocked follow-ups as the interviewer's hints. |

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

## Company notes (from interview reports, 2023–2026)
- **Flipkart (UI1/UI2):** machine coding is often **vanilla JS**, 2–2.5 h, followed by a code review that adds requirements. Asked: product review workflow (S54), e-commerce with multiple wishlists (S17 + follow-ups), image grid with flexbox (S52), "run promises in parallel, then in sequence without async/await" (S43), matching node in a cloned tree (S47).
- **Atlassian:** one React widget round and one JS utility round, with requirements that change mid-round, so follow-ups matter. Asked: Tic-tac-toe with N boards (J14), tabs with lazy panels (J03 follow-ups), chainable API client (S45), cached API call with TTL (S39), analytics batching (ST14), feature flags with TTL (ST09), rich text with undo (ST17).
- **Uber:** progress bars with concurrency (S09), grid lights (J16), Connect Four (S23), async memoize with dedupe (S39), batching sender (S40), rate limiter (S41).
- **Rippling:** concurrency runner (S27), file explorer (S05), data table (S08), transactional store (S35), form builder (ST08), async memoize (S39), load-more → infinite scroll (S03).
- **Dream11:** Promise polyfill with cancel (S37), `Promise.any` (S26), `clearAllTimeouts` (S42), `onlyTwice` (J31), paged book reader with cache and preloading (ST16).
- **Airbnb:** Promise from scratch (S37), in-memory file system (S48), observable store data (S44), star rating built from radio inputs (J04).
- **Meta:** heavy on JS and DOM internals: S34, S47, J28, S36, S26, S28, S38, S42, S44, S46.
- **Microsoft:** 2 h vanilla-JS Outlook-style UI (S55), LRU with expiry (S31/S39), then a review of your own code.
- **Amazon:** carousel and star rating in vanilla JS (J12, J04), WhatsApp-style last-seen timestamp (J42), level-order DOM traversal (S47).
- **Coinbase:** Coinbase Pro UI slice with flashing prices (S56), writing tests for an existing app (S46).
- **Stripe:** Bug Squash (S50) and an integration round.
- **Razorpay:** compound, accessible Tabs with add and remove (J03 follow-up 5), stacked toasts (S10); pair-programming style.
- **Intuit:** "craft demo" rounds where you extend an existing React app with tests. Practise with S50, or by extending a finished reference with a follow-up.
- **Google:** outline / table of contents for a document (S47), Promise `.then/.catch/.finally` as a follow-up to a retry question (S37, S32).
