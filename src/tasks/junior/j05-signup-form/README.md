# Signup Form with Validation

## Problem statement
Build a `SignupForm` with four fields: name, email, password and password confirmation. Validate each field when the user leaves it and again on submit. Show accessible error messages. Send valid data to an async `onSubmit` prop, and handle the pending, success and server-error states.

Interviewers use this task to see whether you can pick a sensible validation timing (not shouting at users while they type the first letter), wire errors up for screen readers, and stop double submits.

## Clarifying questions to ask
- When do errors appear? *(When a field loses focus for the first time, and for every field on submit. Once a field shows an error, re-validate it as the user types, so the error disappears as soon as it's fixed.)*
- What are the rules? *(See the table below. Keep them simple and client-side.)*
- What does a server error look like? *(`onSubmit` rejects with an `Error`. Show its `message`.)*
- What happens after success? *(Replace the form with a welcome message.)*
- Trim input? *(Trim name and email. Never trim passwords.)*

## Functional requirements
- [ ] Four labelled inputs: **Name**, **Email**, **Password**, **Confirm password**. The two password inputs have `type="password"`.
- [ ] Validation rules and exact messages:

  | Field | Rule | Message |
  |---|---|---|
  | Name | not blank after trimming | `Name is required` |
  | Email | not blank | `Email is required` |
  | Email | looks like `local@domain.tld` | `Enter a valid email address` |
  | Password | not empty | `Password is required` |
  | Password | at least 8 characters | `Password must be at least 8 characters` |
  | Confirm password | not empty | `Please confirm your password` |
  | Confirm password | equals password | `Passwords do not match` |

- [ ] A field's error appears after the field is blurred for the first time, or after a submit attempt. After that, the error updates as the user types.
- [ ] Untouched fields show no errors on first render.
- [ ] Submitting (button **Create account**, or `Enter` in any field) validates every field.
  - If anything is invalid: show all errors, move focus to the **first** invalid field, and don't call `onSubmit`.
  - If everything is valid: call `onSubmit({ name, email, password, confirmPassword })` with name and email trimmed.
- [ ] While `onSubmit` is pending, the submit button is disabled and reads **Creating account…**. A second submit must not call `onSubmit` again.
- [ ] On resolve: replace the form with the text `Welcome, <name>!` (for example `Welcome, Ada!`, using the trimmed name as typed).
- [ ] On reject: show the error's `message` (or `Something went wrong` if there is no message) in an alert. Re-enable the button and keep every value the user typed.

## Non-functional requirements
- **Accessibility:**
  - Every input has a real `<label>`.
  - An invalid field has `aria-invalid="true"` and `aria-describedby` pointing at its error message element.
  - The server error is announced with `role="alert"`.
  - Use `noValidate` on the form, so the browser's built-in bubbles don't compete with your messages.
- **Keyboard:**

  | Key | Behaviour |
  |---|---|
  | `Tab` | Moves through the fields in visual order, then to the button |
  | `Enter` | Submits the form from any field (native form behaviour) |
- **UX:** error text is shown in red next to its field, and the submit button shows a pending state. Don't clear the password fields on a server error, so the user can simply retry.

## Constraints
- 40 minutes. React and CSS Modules only. No form or validation libraries (no react-hook-form, Formik, zod).
- The Playground wires `onSubmit` to a fake request that fails when the email is `taken@example.com`.

## Data / API contract
```ts
interface SignupValues { name: string; email: string; password: string; confirmPassword: string }
interface SignupFormProps {
  onSubmit: (values: SignupValues) => Promise<void>;
}
```
Default-export the component from `Solution.tsx`.

## Test contract
- Inputs are found with `getByLabelText('Name' | 'Email' | 'Password' | 'Confirm password')` (exact label text).
- Submit: `button` named `Create account`. While pending it's disabled and named `Creating account…`. Tests match it with `/creat/i`.
- Error messages are findable with `getByText(<message>)`, using the exact strings in the table.
- An invalid field has `aria-invalid="true"`, and its accessible description contains its error message (`toHaveAccessibleDescription(/…/)`).
- The server error is inside an element with `role="alert"`.
- Success text: `Welcome, <name>!`.

## Edge cases
- Typing a new password after "Confirm password" was already validated: the mismatch error should update.
- A name of only spaces.
- The component unmounts while `onSubmit` is pending: no state update after unmount.
- Pressing `Enter` twice quickly while pending.

## Follow-ups
1. **Password strength meter.** Show Weak / Medium / Strong as the user types, based on length and character variety, and announce changes politely.
2. **Async email check.** On email blur, check availability against a fake API, show `Checking…`, and ignore stale responses when the email changes.
3. **Generic `useForm` hook.** Extract the validation, touched and submit logic into `useForm({ initialValues, validate, onSubmit })` and rebuild the form with it.
4. **Field-level server errors.** The server rejects with `{ fieldErrors: { email: 'Already registered' } }`. Show each message under its field and focus the first one.

## Concepts covered
Controlled form state · *touched* vs *dirty* · validation as a pure function of the values · `aria-invalid` + `aria-describedby` · focusing the first error · async submit lifecycle (idle → submitting → success/error) · stopping double submits.

Related: J19 Form Wizard · J08 Like Button (async states) · S-level form builder tasks.
