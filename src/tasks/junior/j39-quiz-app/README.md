# Quiz App

## Problem statement
Build a `QuizApp` that takes an array of multiple-choice questions and shows them one at a time. The user picks one option, presses **Next** (or **Finish** on the last question), and at the end sees their score and a review of every question: what they answered, the correct answer, and whether they got it right. **Restart** starts over.

Optionally, each question has a time limit. When the time runs out, the quiz moves on by itself.

Interviewers use this to see how you model step-by-step state, whether you derive the score instead of keeping a second counter in sync, and how you reset a timer per question.

## Clarifying questions to ask
- Where do the questions come from? *(A `questions` prop. Fetching them is follow-up 1.)*
- Can the user change their pick before pressing Next? *(Yes. Only the option selected when leaving the question counts.)*
- Can the user go back to a previous question? *(No, not in the base version. See follow-up 3.)*
- Should we show right/wrong straight after each answer? *(No. Results only appear on the final screen.)*
- What happens when the timer runs out? *(The quiz moves to the next question, or to the results after the last one. If an option was selected, it counts as the answer. Otherwise the question counts as unanswered, which is incorrect.)*
- Are options shuffled? *(No, they are shown in the given order. Shuffling is follow-up 2.)*

## Functional requirements
- [ ] Show one question at a time: its text, its options as radio buttons, and the progress `Question N of M`.
- [ ] No option is selected when a question first appears.
- [ ] The `Next` button is disabled until an option is selected. On the last question the button reads `Finish` instead.
- [ ] Pressing Next records the selected option and shows the next question. Pressing Finish records it and shows the results.
- [ ] With `timePerQuestion` > 0, show `Time left: S` (whole seconds), counting down by 1 each second. The timer restarts from the full time on every question. At 0, move on automatically, recording the selected option if there is one.
- [ ] Without `timePerQuestion` (or with 0), show no timer.
- [ ] The results screen shows `You scored S out of M` and a review list with one item per question, in order. Each item shows the question, `Your answer: <option>` (or `Your answer: No answer`), `Correct answer: <option>`, and `Correct` or `Incorrect`.
- [ ] `Restart` goes back to question 1 with no answers recorded and no option selected.
- [ ] An empty `questions` array renders the text `No questions`.

## Non-functional requirements
- **Accessibility:**
  - Options are native `<input type="radio">` elements with `<label>`s, grouped so the question text names the group: a `<fieldset>` with a `<legend>`, or `role="radiogroup"` with `aria-labelledby`.
  - When a new question or the results screen appears, move focus to its heading (or the group) so keyboard and screen reader users know the content changed.
  - The per-second timer is not a live region. Consider announcing only "10 seconds left" once.
- **Keyboard:**

  | Key | Behaviour |
  |---|---|
  | `Tab` | Move into the option group, then to Next / Finish |
  | `ArrowDown` / `ArrowUp` | Move the selection between options (native radio behaviour) |
  | `Space` | Select the focused option |
  | `Enter` / `Space` on the button | Next, Finish or Restart |

- **Correctness:** derive the score from the recorded answers. Don't keep a separate score counter that can drift.
- **Styling:** option rows with big click targets and a clear checked state, a progress bar or `Question N of M` header, and green/red markers in the review list that don't rely on colour alone.

## Constraints
- 40 minutes. React and CSS Modules only.
- No mock API in the base version. Sample questions for the Playground are in `data.ts`.
- Keep the public types in `types.ts` unchanged.

## Data / API contract
```ts
interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  answerIndex: number; // index into options
}

interface QuizAppProps {
  questions: QuizQuestion[];
  timePerQuestion?: number; // seconds; omit or 0 for no timer
}
```
Default-export the component from `Solution.tsx`.

## Test contract
- Text `Question N of M` (the full text of one element), and the current question's text.
- Each option is a `radio` named by the option text. Only the current question's radios are rendered.
- A `button` named `Next` on every question except the last, where it is named `Finish`.
- With a timer: text `Time left: S`, as the full text of one element.
- Results: text `You scored S out of M` (the full text of one element), and a `list` named `Review` (for example `<ul aria-label="Review">`) with one `listitem` per question, in order. Each item's text contains the question, `Your answer: …`, `Correct answer: …`, and the word `Correct` or `Incorrect`.
- A `button` named `Restart` on the results screen.
- An empty question list renders the text `No questions`.
- Timer tests use `vi.useFakeTimers({ shouldAdvanceTime: true })` and advance time well inside each second, never exactly on a boundary.

## Edge cases
- Two consecutive questions with the same option text in the same position: the selection must not carry over to the next question.
- Pressing Next and the timer expiring at almost the same moment must not skip a question.
- `Restart` while a timer is running must restart the timer for question 1, not keep the old countdown.
- The `questions` prop changing mid-quiz: decide whether to reset. At minimum don't crash on an index that no longer exists.
- An `answerIndex` outside `options`: treat it as a data error. Don't crash, and the question can never be answered correctly.

## Follow-ups
1. **Fetch questions.** Replace the prop with `loadQuestions(signal) => Promise<QuizQuestion[]>`. Show a loading state, an error state with `Retry`, and abort the request on unmount.
2. **Shuffle options.** Shuffle each question's options once per attempt (so they don't reorder on re-render), using an injected `random()`. The review and scoring must still use the original correct answer.
3. **Back navigation.** Add a `Back` button (not shown on question 1) that returns to the previous question with its recorded answer still selected. Moving forward again shows already-answered questions with their answers selected, and changing an answer updates the score. Decide what the timer does when you go back.
4. **Persist progress.** Save the current question and answers to `localStorage`, keyed by a hash of the question ids, so a refresh resumes where the user left off. Ignore saved progress that belongs to a different question set.

## Concepts covered
Step-by-step UI state (current index, answers, phase) · deriving the score from answers · native radio groups with `fieldset`/`legend` · resetting a per-step timer with effect dependencies and cleanup · focus management on step changes · keys to reset child state.

Related: J19 Multi-step Form Wizard · J20 Poll Widget · J07 Stopwatch & Countdown.
