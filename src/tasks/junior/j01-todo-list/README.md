# Todo List

## Problem statement
Build a small todo app. A user can add todos, mark them done, rename them in place, delete them, and filter the list by status. The list survives a page reload because it is saved to `localStorage`.

It's the "hello world" of machine-coding rounds. Interviewers use it to judge how cleanly you model state, handle forms and keys, and cover the details (empty input, cancelling an edit, pluralisation) without being asked.

## Clarifying questions to ask
- Should todos be saved anywhere? *(Yes, in `localStorage` under the key `j01-todos`. No server.)*
- What happens when an edit is saved with an empty title? *(The todo is deleted, as in TodoMVC.)*
- Are leading and trailing spaces kept? *(No. Titles are trimmed. A blank title is never added.)*
- Does the selected filter need to survive a reload? *(No, only the todos. See the follow-ups.)*
- Where do new todos go? *(At the bottom of the list.)*

## Functional requirements
- [ ] A text input labelled **New todo**. Pressing `Enter` adds a todo with the trimmed text and clears the input. Blank input does nothing.
- [ ] Each todo shows a checkbox that toggles `completed`, its title, an **Edit** button and a **Delete** button.
- [ ] Completed todos are visually distinct (for example, struck through).
- [ ] Clicking **Edit**, or double-clicking the title text, replaces the title with a text input labelled **Edit todo**. The input is pre-filled with the current title and receives focus.
  - `Enter` or moving focus away (blur) saves the trimmed value.
  - `Escape` cancels and restores the previous title.
  - Saving an empty value deletes the todo.
- [ ] **Delete** removes the todo.
- [ ] Three filter buttons: **All**, **Active**, **Completed**. Only matching todos are shown. The selected filter has `aria-pressed="true"`.
- [ ] A counter of active (not completed) todos: `1 item left`, `0 items left`, `3 items left`.
- [ ] A **Clear completed** button, shown only while at least one todo is completed. It removes every completed todo.
- [ ] When there are no todos at all, show the text `Nothing to do yet`.
- [ ] Every change is saved to `localStorage` under `j01-todos` as a JSON array of `Todo`. On load, the saved list is restored.

## Non-functional requirements
- **Accessibility:**
  - Every input has a label (a visible `<label>` or `aria-label`).
  - Icon-only buttons still need text names that include the todo title, so screen-reader users know which row they act on.
  - The filter buttons are a group of toggle buttons using `aria-pressed`.
- **Keyboard:**

  | Key | Where | Behaviour |
  |---|---|---|
  | `Enter` | New todo input | Add the todo |
  | `Enter` | Edit input | Save the edit |
  | `Escape` | Edit input | Cancel the edit |
  | `Space` | Checkbox | Toggle completed (native) |
- **Robustness:** corrupt or missing `localStorage` data must not crash the app. Start with an empty list instead.
- **Keys:** use stable ids for React keys, never the array index.

## Constraints
- 45 minutes. React and CSS Modules only. No state libraries.
- No mock API. Persistence is `localStorage` only.

## Data / API contract
```ts
interface Todo { id: string; title: string; completed: boolean }
type TodoFilter = 'all' | 'active' | 'completed';
const TODO_STORAGE_KEY = 'j01-todos'; // JSON.stringify(Todo[])
```
Default-export the app component from `Solution.tsx`. It takes no props.

## Test contract
- New todo input: `textbox` named `New todo`.
- Each todo's checkbox: `checkbox` whose accessible name is exactly the todo title.
- Row buttons: `button` named `Edit <title>` and `Delete <title>`, for example `Edit Buy milk`.
- The title text itself is findable with `getByText(<title>)`, and double-clicking it starts editing.
- Edit input: `textbox` named `Edit todo`.
- Filters: `button`s named `All`, `Active`, `Completed`, with `aria-pressed`.
- Counter text: `N items left` / `1 item left` (an exact text match on one element).
- `button` named `Clear completed`.
- Empty state text: `Nothing to do yet`.
- `localStorage.getItem('j01-todos')` parses to an array of `{ id, title, completed }`. Tests seed it before rendering, too.

## Edge cases
- Adding the same title twice creates two separate todos, each with its own id.
- Double-clicking the title while a checkbox shares its label must not leave the todo toggled.
- Editing a todo while the **Completed** filter is active, then un-completing it: the todo leaves the view.
- `localStorage` holding `"not json"` or `{}`.
- Blur fires after `Escape`: the cancel must win.

## Follow-ups
1. **Toggle all.** Add a checkbox named `Mark all as complete` that completes every todo, or un-completes every todo when all are already done. Its state reflects the list, including an indeterminate state.
2. **Filter in the URL.** Keep the filter in the URL (`#/active`, `#/completed`), so reload and the back button work.
3. **Server sync.** Persist through `saveTodo` / `deleteTodo` in `src/mocks/api.ts` with optimistic updates, and roll back with an error message when a call fails.
4. **Reorder.** Let the user reorder todos with drag and drop, plus a keyboard alternative (for example, `Alt+ArrowUp` / `Alt+ArrowDown`).

## Concepts covered
Controlled inputs · immutable array updates · derived state (counts, filtered list) instead of duplicated state · stable keys · lazy `useState` initialiser for reading storage · `useEffect` for writing it · inline edit with focus management.

Related: J02 Accordion · J18 Transfer List · J25 useLocalStorage.
