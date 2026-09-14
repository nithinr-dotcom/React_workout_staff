# ⚛️ Machine Coding Lab

A local practice app for React machine-coding interview rounds. It has 78 tasks across Junior, Senior and Staff levels, drawn from reports of real interview rounds (GreatFrontEnd, BFE.dev, Devtools.tech, frontendlead, and write-ups from Atlassian, Rippling, Uber, Meta, Swiggy, Flipkart, Intuit and Razorpay).

```bash
npm install
npm run dev          # open http://localhost:5173
```

## How a task works
1. **Pick a task** from the sidebar (Junior / Senior / Staff toggle), or start a **Mock interview**.
2. **Read the requirements** in the left pane.
3. **Code in your editor** at `src/tasks/<level>/<id>/Solution.tsx`:
   - Delete the `NOT_STARTED` line first.
   - The right pane shows a live preview of your file.
4. **Run the tests:**
   - `npm test -- <id>` checks the base requirements.
   - `npm run test:followups -- <id>` also checks follow-ups.
5. **Unlock follow-ups** one at a time. They simulate an interviewer changing the requirements.
6. **Press Finish** on the timer and set your confidence. Only then use **🔒 Reference** to compare with the reference solution.
7. **Revisit** tasks when the dashboard says they're due (3, 7, 21 and 45 days after solving).

## Each task folder
| File | What it is |
|---|---|
| `README.md` | Full spec: problem, clarifying questions, requirements, accessibility, test contract, edge cases, hidden follow-ups |
| `types.ts` | Public contract (props / exports) that tests rely on |
| `Solution.tsx` / `.ts` | **Your code** |
| `Playground.tsx` | Demo harness that renders your Solution (and the Reference) with sample data |
| `task.test.tsx` | Acceptance tests that query only by role, label and text |
| `Reference.tsx` / `.ts` | Hidden reference solution (or a placeholder until written) |
| `DESIGN.md` | Staff tasks only: design write-up template |

Don't open `Reference.*` files in your editor. The app hides them for a reason.

## Scripts
| Command | Purpose |
|---|---|
| `npm run dev` | Practice app |
| `npm test -- j02` | Tests against your solution (watch mode). Tasks still marked `NOT_STARTED` are skipped |
| `npm run test:followups -- j02` | Also run the follow-up suites |
| `npm run test:ref` | Run all tests against the reference solutions |
| `npm run test:ui` | Vitest UI |
| `npm run reset-task -- j02` | Restore the blank starter for a fresh attempt (commit first) |
| `npm run new-task -- senior s37-color-picker "Color Picker" ui` | Scaffold your own task |
| `npm run check-tasks` | Validate task folders |
| `npm run typecheck` / `npm run lint` / `npm run build` | Usual checks |

## Mock backend
`src/mocks/api.ts` provides async functions with random latency, AbortSignal support and optional failures (`failRate`), so you can practise loading, error, race-condition and retry states. `src/mocks/mockSocket.ts` is a WebSocket-like stream for chat and notification tasks. You can tune both from the browser console:

```js
__mockApi.configure({ latency: [1500, 3000], failRate: 0.3 })
```

## Ground rules
- `.vscode/settings.json` turns off Copilot, Cursor and Codeium inline completions in this workspace, on purpose.
- Tasks use React and CSS Modules only. No UI libraries, because most rounds don't allow them.
- Progress and notes live in localStorage. Export them from the dashboard regularly.

See [`docs/ROADMAP.md`](docs/ROADMAP.md) for the 10-week plan, and [`docs/TASK_AUTHORING.md`](docs/TASK_AUTHORING.md) to add tasks.
