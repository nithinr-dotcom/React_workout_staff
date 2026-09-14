# Users Directory CRUD

## Problem statement
Build the internal "People" page of an HR product. `UsersDirectory` loads every user, shows them in a table, and lets an admin:
- **search** by name or email, and **filter** by role
- **add** a user, or **edit** one, in a modal form with validation
- **delete** a user after confirming

Deletes are **optimistic**: the row disappears immediately. If the server then fails, the row comes back where it was and an error message explains what happened.

The data layer is injected through an `api` prop with the same signatures as `getAllUsers`, `saveUser` and `deleteUser` in `src/mocks/api.ts`. The Playground passes the real mock functions, and the tests pass stubs.

## Clarifying questions to ask
- Is search and filtering client-side or server-side? *(Client-side. `getAllUsers` returns the whole list, about 120 rows.)*
- Should adding and editing be optimistic too? *(No. Save is pessimistic: wait for the server, then update the table with the user it returns. Only delete is optimistic.)*
- What gets validated? *(Name is required, the email must be valid and not used by another user, and age must be a whole number from 18 to 100.)*
- Where do new users appear? *(At the end of the list. Edited users keep their position.)*
- Do we need pagination or sorting? *(Not in the base version. See the follow-ups.)*
- What is `joinedAt` for a new user? *(Today's date, `yyyy-mm-dd`. Editing never changes it.)*

## Functional requirements
- [ ] **Load:** on mount, call `api.getAllUsers({ signal })`. While it's pending, show `Loading users…`.
  - On failure, show an alert with `Failed to load users` and a `Retry` button that loads again.
  - Abort the request on unmount.
- [ ] **Table:** one row per user in the order the API returned them, with the columns Name, Email, Role, Department and Status (`Active` / `Inactive`), plus row actions.
- [ ] **Empty states:** `No users yet` when the API returns no users. `No users match your filters` when users exist but none match.
- [ ] **Search:** a text field labelled `Search users` filters by name **or** email, as a case-insensitive substring match on the trimmed query.
- [ ] **Role filter:** a select labelled `Filter by role` with `All roles` (the default) plus every role. It combines with search (AND).
- [ ] **Add:** an `Add user` button opens a modal dialog titled `Add user` with an empty form.
- [ ] **Edit:** each row has an `Edit <name>` button that opens a dialog titled `Edit user`, prefilled with that user's data.
- [ ] **Form fields:**
  - `Name`: text
  - `Email`: email
  - `Role`: select, default `Engineer`
  - `Department`: select, default `Platform`
  - `Age`: number, empty for a new user
  - `Active`: checkbox, checked by default
  - Buttons `Save` and `Cancel`
- [ ] **Validation** runs when the user clicks Save. Messages, shown next to the field:
  - `Name is required` when the trimmed name is empty.
  - `Email is required` when empty, `Enter a valid email` when it doesn't look like `name@domain.tld`, and `Email is already in use` when another user has it (case-insensitive; a user's own email is fine).
  - `Age must be between 18 and 100` when age is empty, not a whole number, or out of range.
  - If anything is invalid, don't call the API, and move focus to the first invalid field.
- [ ] **Save:** call `api.saveUser(draft)` with the trimmed name and email, `age` as a number, and:
  - no `id` and today's `joinedAt` for a new user
  - the user's `id` and original `joinedAt` for an edited user
  - While saving, disable the Save button and ignore double submits.
  - On success, close the dialog and put the **returned** user into the table: append it for a create, replace the row in place for an edit.
  - On failure, keep the dialog open with the form values intact and show an alert inside it: `Could not save user. Please try again.`
- [ ] **Cancel / Escape** closes the dialog without saving.
- [ ] **Delete:** each row has a `Delete <name>` button that opens a confirmation `alertdialog` named `Delete <name>?` with `Delete` and `Cancel` buttons.
  - Confirming closes the dialog, removes the row **immediately**, and calls `api.deleteUser(id)`.
  - If that call fails, put the user back **at its original position** and show an alert `Could not delete <name>`, with a `Dismiss` button.

## Non-functional requirements
- **Accessibility:**
  - The table is a real `<table>` with `<th scope="col">` headers.
  - Row action buttons have unique accessible names (`Edit Ada Lovelace`), not just "Edit". Use visually hidden text or `aria-label`.
  - Dialogs follow the [APG Dialog (Modal) pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/): `role="dialog"` (the delete confirmation uses `role="alertdialog"`), `aria-modal="true"`, and `aria-labelledby` pointing at the title.
    - On open, move focus to the first form field (the `Cancel` button for delete).
    - Trap Tab inside the dialog.
    - On close, return focus to the button that opened it. If that row is gone, move focus to `Add user`.
  - Invalid fields get `aria-invalid="true"` and `aria-describedby` pointing at their error message.
  - Load and delete errors use `role="alert"`. Filter result counts can use a polite `role="status"`.
- **Keyboard:**

  | Key | Behaviour |
  |---|---|
  | `Tab` / `Shift+Tab` | Move through filters, table actions, and inside an open dialog (trapped) |
  | `Enter` (in a form field) | Submit the form (native form submit) |
  | `Escape` | Close the open dialog without saving and restore focus |
  | `Enter` / `Space` on row buttons | Open the edit or delete dialog |

- **Performance:** filtering 120 rows on each keystroke is cheap. Derive the visible rows from `users + query + role` and don't store them in state. Explain when you would debounce or memoize.
- **UX states:** loading, load error with retry, empty, no matches, saving, save error, delete rollback error.

## Constraints
- 90 minutes. React and CSS Modules only. No form, table, dialog or data-fetching libraries.
- Use only the injected `api`. Don't import from `src/mocks/api.ts` in the Solution. Types may be imported.
- Keep the public types in `types.ts` unchanged.

## Data / API contract
```ts
type Role = 'Engineer' | 'Designer' | 'Manager' | 'Product' | 'Support';
type Department = 'Platform' | 'Growth' | 'Payments' | 'Search' | 'Mobile';

interface User {
  id: number; name: string; email: string; role: Role; department: Department;
  age: number; active: boolean; joinedAt: string; // yyyy-mm-dd
}
type UserDraft = Omit<User, 'id'> & { id?: number };

interface UsersApi {
  getAllUsers(options?: { signal?: AbortSignal }): Promise<User[]>;
  saveUser(user: UserDraft, options?: { signal?: AbortSignal }): Promise<User>;
  deleteUser(id: number, options?: { signal?: AbortSignal }): Promise<{ ok: true }>;
}

interface UsersDirectoryProps { api: UsersApi }
```
`ROLES` and `DEPARTMENTS` are exported from `types.ts`. Default-export the component from `Solution.tsx`.

## Test contract
- The `api` methods are `vi.fn`s. Some return deferred promises so the tests can check the in-between states.
- Texts: `Loading users…`, `Failed to load users`, `No users yet` and `No users match your filters`.
- Buttons: `Retry`, `Add user`, `Edit <name>`, `Delete <name>`, `Save`, `Cancel`, `Delete` and `Dismiss`.
- Filters: `getByLabelText('Search users')` and `getByLabelText('Filter by role')`. The role filter's option values are the role names, and `''` for All roles.
- Dialogs: `getByRole('dialog', { name: 'Add user' | 'Edit user' })` and `getByRole('alertdialog', { name: 'Delete <name>?' })`.
- Form fields, queried inside the dialog by exact label: `Name`, `Email`, `Role`, `Department`, `Age` and `Active`.
- Validation messages are the exact strings listed above. Invalid fields have `aria-invalid="true"`.
- The tests type an invalid email into the `Email` field and click Save. jsdom enforces native constraint validation, so if you use `type="email"`, `required` or `min`/`max`, put `noValidate` on the form. The validation is yours, not the browser's.
- Save and delete errors are `role="alert"` elements whose text matches `/could not save user/i` and `Could not delete <name>`.
- A row's presence is checked through its `Edit <name>` button. Row order is checked through the order of the `Edit …` buttons.

## Edge cases
- The user edits a row while its delete is still in flight. *(Assume: it can't happen, because the row is gone. Say how you would handle a server push re-adding it.)*
- Two deletes in flight where the first fails: the rollback must not undo the second delete. Restore by position relative to the current list, not by replacing the whole list with an old snapshot.
- Filters are active when a rolled-back user comes back and doesn't match them: it must stay hidden.
- Saving an edit that changes the role while filtered by the old role: the row disappears from the filtered view.
- The component unmounts while a save or delete is pending: no state updates after unmount.
- Emails with surrounding whitespace or mixed case: `Ada@Example.com ` duplicates `ada@example.com`.
- The user presses Save twice quickly: only one `saveUser` call.

## Follow-ups
1. **Undo delete.** Instead of a confirmation dialog, delete immediately and show a toast with `Undo` for 5 seconds. Only call `deleteUser` after the toast expires. What happens if the page closes during those 5 seconds?
2. **Sort and paginate.** Add sortable column headers (`aria-sort`) and client-side pagination. Keep the sort, filter and page in the URL search params so the view is shareable and survives a reload.
3. **Server-side search.** Switch to `getUsers({ search, role, page })` from the mock API with a debounced query, abort stale requests, and keep the previous page visible while the next one loads.
4. **Optimistic edit.** Make Save optimistic too. How do you roll back when a later successful edit to the same row has already happened? Discuss version numbers or `updatedAt`.
5. **Bulk actions.** Add row checkboxes with select-all (including the indeterminate state) and a bulk delete that reports partial failures.

## Concepts covered
Dependency injection of the data layer · loading / error / empty state machines · derived state for filtering · controlled forms with validation and `aria-invalid` · modal and alert dialogs with focus management · optimistic updates with position-preserving rollback · stale responses and unmount safety.

Related: S01 Modal Dialog · S08 Data Table · S10 Toast System · S33 useFetch.
