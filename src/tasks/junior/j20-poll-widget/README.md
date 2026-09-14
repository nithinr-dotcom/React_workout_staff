# Poll Widget

## Problem statement
Build a `PollWidget` for a question with several options, like the polls embedded in social feeds. The user picks one option and presses **Vote**. The widget then switches to a results view: every option with its vote count and share of the total, the user's choice marked, and the total number of votes. The user can **Change vote**, which goes back to the voting view with their current choice preselected. Voting again moves their vote instead of adding a second one.

The user's vote is remembered in `localStorage`. After a reload, a user who has already voted sees the results straight away.

## Clarifying questions to ask
- Do `options[].votes` include the current user's vote? *(No. They're other people's votes. Displayed counts add the user's vote on top.)*
- How are percentages rounded? *(Each option's share rounded to the nearest whole percent with `Math.round`. Making them always add up to exactly 100 is follow-up 1, and the base tests accept either method.)*
- What if the stored vote refers to an option that no longer exists? *(Ignore it and show the voting view.)*
- Is there a backend? *(No. Everything is local for this task. Syncing with a server is a follow-up.)*
- Can the user remove their vote entirely? *(Not in the base version.)*

## Functional requirements
- [ ] **Voting view:** show the question and one radio button per option. `Vote` is disabled until an option is selected.
- [ ] Pressing `Vote` records the selected option as the user's vote, saves the option id to `localStorage` under `poll:<pollId>`, and switches to the results view.
- [ ] **Results view:** for each option, in the original order, show:
  - the label
  - the count (`options[i].votes`, plus 1 if it's the user's choice) as `N votes`, or `1 vote` when N is 1
  - the percentage of the total as `NN%`
  - a bar whose width matches the percentage
- [ ] Mark the user's choice with the text `Your vote`.
- [ ] Show the total as `N votes total`, or `1 vote total`.
- [ ] `Change vote` returns to the voting view with the current choice preselected. Voting again replaces the previous vote, updates storage and never counts the user twice.
- [ ] On mount, if `localStorage` has a vote for this `pollId` that matches an option id, start in the results view with that vote counted.
- [ ] Polls with different `pollId`s don't share votes.

## Non-functional requirements
- **Accessibility:**
  - Voting view: a `<fieldset>` with the question as `<legend>` and native radio inputs with labels. Arrow keys move between radios natively.
  - Results view: a list (`<ul>` or `<ol>`) with `aria-label="Results"`. Each bar is decorative (`aria-hidden`), because the percentage is already in the text.
  - After voting, move focus to the results (for example the results heading or the `Change vote` button) and announce the update in a polite live region.
- **Keyboard:**

  | Key | Behaviour |
  |---|---|
  | `Tab` | Move into the radio group, then to `Vote` |
  | `ArrowUp` / `ArrowDown` | Move between options in the radio group (native) |
  | `Space` | Select the focused radio |
  | `Enter` / `Space` on `Vote` / `Change vote` | Activate (native) |

- **Robustness:** reading `localStorage` must not crash if the stored value is missing or garbage, or if storage throws (private mode).
- **Styling:** bars animate their width on reveal. The user's choice is highlighted.

## Constraints
- 35 minutes. React and CSS Modules only.
- No mock API. Persistence is `localStorage` only.
- Keep the public types in `types.ts` unchanged.

## Data / API contract
```ts
interface PollOption {
  id: string;
  label: string;
  votes: number; // other people's votes, excluding the current user
}

interface PollWidgetProps {
  pollId: string;   // storage key: `poll:${pollId}` → the chosen option id (plain string)
  question: string;
  options: PollOption[];
}
```
Default-export the component from `Solution.tsx`.

## Test contract
- Voting view:
  - a `group` named by the `question`
  - `radio`s named by option labels
  - a `button` named `Vote`
- Results view:
  - a `list` named `Results`, with one `listitem` per option in order
  - each item's text contains its label, its count (`N votes` / `1 vote`) and its percentage (`NN%`)
  - the user's item also contains `Your vote`
  - the text `N votes total` / `1 vote total`
  - a `button` named `Change vote`
- Storage: `localStorage.getItem('poll:<pollId>')` is the chosen option's `id` as a plain string. Tests may set it before rendering.
- Tests find an option's list item by checking which `listitem` contains the label.

## Edge cases
- Every option has 0 votes from others: after voting, the user's option is 100% and the others are 0%.
- Changing the vote to the same option: counts don't change.
- `localStorage` contains a vote for an id that isn't in `options`: show the voting view and count nothing.
- Label text that contains another label, like `React` and `React Native`: match whole items, not substrings.

## Follow-ups
1. **Percentages that add up to 100.** With `Math.round`, three options at 1 vote each show 33% + 33% + 33% = 99%. Use the largest remainder method so the displayed percentages always add up to exactly 100 (when there is at least one vote). Break ties by option order: earlier options get the extra point first.
2. **Server sync.** Send votes to an async `onVote(optionId, previousId)` prop with an optimistic update and rollback on failure (see J08 Like Button).
3. **Multiple choice.** Support `maxChoices > 1` with checkboxes, and explain how that changes the percentage denominator (votes or voters?).
4. **Cross-tab sync.** When the user votes in another tab, update this widget using the `storage` event.

## Concepts covered
Deriving displayed counts from props plus local state · switching between views · native radio groups · `localStorage` persistence with safe parsing · rounding percentages.

Related: J08 Like Button · J04 Star Rating · J25 Hooks pack (`useLocalStorage`).
