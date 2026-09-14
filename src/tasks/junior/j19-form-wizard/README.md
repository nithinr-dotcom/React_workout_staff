# Multi-step Form Wizard

## Problem statement
Build a `FormWizard` that collects signup details over three steps:

1. **Account:** `Email` and `Password`.
2. **Profile:** `Full name` and an optional `Job title`.
3. **Review:** a read-only summary of everything entered, with a `Submit` button.

The user can't leave a step with invalid data: `Next` validates only the current step. `Back` returns to the previous step with everything still filled in. A step indicator shows where the user is. On Review, `Submit` calls the async `onSubmit(data)` prop. While it runs, the button is disabled. When it resolves, the wizard shows a success message.

## Clarifying questions to ask
- When do errors appear? *(When `Next` is pressed. Clear a field's error as soon as the user edits that field.)*
- Does `Back` validate? *(No. Back always works and never loses data, even invalid data.)*
- Can the user jump straight to a step from the indicator? *(No, not in the base version. See the follow-ups.)*
- How is the password shown on Review? *(Never in plain text. Show a mask such as `••••••••`.)*
- What if `onSubmit` rejects? *(Out of scope for the base version. Assume it resolves. Error handling is a follow-up.)*

## Functional requirements
- [ ] Start on the **Account** step. Each step shows a heading with the step name: `Account`, `Profile` or `Review`.
- [ ] A step indicator lists the three steps in order and marks the current one.
- [ ] **Account** validation when `Next` is pressed:
  - Email empty: `Email is required`.
  - Email present but not shaped like `something@something.something`: `Enter a valid email address`.
  - Password shorter than 8 characters (including empty): `Password must be at least 8 characters`.
- [ ] **Profile** validation when `Next` is pressed:
  - Full name empty or only whitespace: `Full name is required`.
  - Job title is optional.
- [ ] If the current step has errors, stay on it, show every error for that step and move focus to the first invalid field.
- [ ] If the step is valid, go to the next step.
- [ ] `Back` goes to the previous step. It is not shown, or is disabled, on the first step. All entered values are kept in both directions.
- [ ] **Review** shows the email, full name and job title (or `Not provided` when empty). It must not show the password in plain text.
- [ ] `Submit` (on Review only) calls `onSubmit` once with `{ email, password, fullName, jobTitle }`. Trim `fullName` and `jobTitle`.
- [ ] While `onSubmit` is pending, disable `Submit` and `Back`.
- [ ] When it resolves, replace the wizard with the text `Account created`.

## Non-functional requirements
- **Accessibility:**
  - The step indicator is an ordered list (`<ol>`) with `aria-label="Progress"`. The current step's list item has `aria-current="step"`.
  - Every input has a visible `<label>`. An invalid input has `aria-invalid="true"` and its error is linked via `aria-describedby`.
  - When the step changes, move focus to the new step's heading (use `tabIndex={-1}`) so screen-reader users hear where they are.
  - Use appropriate `type` and `autoComplete` values (`email`, `new-password`, `name`, `organization-title`).
- **Keyboard:**

  | Key | Behaviour |
  |---|---|
  | `Tab` / `Shift+Tab` | Move between fields and buttons |
  | `Enter` in a field | Same as `Next` (or `Submit` on Review) |

- **State:** keep all step data in one place, so unmounting a step doesn't lose values.
- **Styling:** an indicator showing completed, current and upcoming steps, and buttons aligned at the bottom.

## Constraints
- 45 minutes. React and CSS Modules only. No form libraries.
- No mock API. The Playground passes a fake `onSubmit` with a delay.
- Keep the public types in `types.ts` unchanged.

## Data / API contract
```ts
interface WizardData {
  email: string;
  password: string;
  fullName: string;
  jobTitle: string; // '' when not provided
}

type WizardStep = 'account' | 'profile' | 'review';

interface FormWizardProps {
  onSubmit: (data: WizardData) => void | Promise<void>;
}
```
Default-export the component from `Solution.tsx`.

## Test contract
- Inputs are found with `getByLabelText('Email')`, `getByLabelText('Password')`, `getByLabelText('Full name')` and `getByLabelText('Job title')`. Put any "(optional)" hint outside the label, or in `aria-describedby`.
- Step headings are `heading`s named exactly `Account`, `Profile` and `Review`.
- The indicator is a `list` named `Progress`. Its `listitem`s contain the step names, and the current one has `aria-current="step"`.
- `button`s named `Next`, `Back` and `Submit`.
- Error messages are the exact strings above. Tests check them with `getByText` and `aria-invalid="true"`.
- On Review, each value (email, full name, job title or `Not provided`) is its own text node or element, so `getByText('ada@example.com')` matches.
- The success text is `Account created`.

## Edge cases
- Pressing `Next` twice quickly on a valid step must not skip a step.
- Fixing a field removes its error, but the other field's error stays until it's fixed too.
- `Back` from Profile, clear the email, then `Next`: the error must reappear (validation isn't cached).
- Double-clicking `Submit` calls `onSubmit` only once.

## Follow-ups
1. **Submit errors.** If `onSubmit` rejects, stay on Review, re-enable the buttons and show the error message in an alert. Retrying must work.
2. **Clickable indicator.** Let users jump back to any completed step from the indicator, but never forward past a step that hasn't been validated.
3. **Config-driven steps.** Describe steps as data (fields, labels, validators) so adding a fourth step doesn't need new JSX. What becomes harder?
4. **Persist the draft.** Save progress (except the password) to `sessionStorage` and restore the step and values after a reload.

## Concepts covered
One source of truth for multi-step form data · validation scoped to a step · focus management when views change · `aria-current="step"` · async submit and double-submit protection.

Related: J05 Signup Form with Validation · J17 Mortgage Calculator.
