# Email Client (3-pane)

## Problem statement
Build the core of an Outlook-style web mail client. `EmailClient` has three panes:

1. **Folders:** Inbox, Sent and Archive, each with its unread count.
2. **Message list:** the messages in the current folder, newest first, with a checkbox on each row and a search box above.
3. **Reading pane:** the message that is currently open.

Power users triage mail with the keyboard, without touching the mouse. They move through the list with `j`/`k`, open a message with `Enter`, archive it with `e` and delete it with `#`. After a message disappears, focus must land somewhere sensible, so the user can keep triaging.

All mailbox state lives in one reducer. Unread counts and the visible list are **derived** from it during render, never stored separately.

> Microsoft has asked this as a 2-hour UI round in vanilla JS ("build an Outlook-like UI"). Here it's React, but the state and focus design questions are the same.

## Clarifying questions to ask
- Is there a server? *(No. The mailbox comes from `initialEmails` once on mount, and every change is local. Syncing with an API is out of scope.)*
- What does delete do, given there's no Trash folder? *(It removes the message permanently.)*
- What does `e` do in the Archive folder? *(Nothing: the message is already archived. In Inbox and Sent it moves the message to Archive.)*
- Does moving focus with `j`/`k` open a message? *(No. Only `Enter` or a click opens a message, and opening marks it read.)*
- Does search cover all folders? *(No, only the current folder. It matches subject, sender or body, case-insensitively. The search text stays when you switch folders.)*
- What happens to the selection and the open message when switching folders? *(Both are cleared.)*
- Which folders show an unread count? *(Every folder with at least one unread message. Zero isn't shown.)*

## Functional requirements
- [ ] **Folders:** a nav with one button per folder (`Inbox`, `Sent`, `Archive`), each showing its unread count when above 0.
  - Clicking a folder shows its messages. The current folder has `aria-current="page"`.
  - Inbox is the starting folder.
- [ ] **Message list:**
  - One row per message in the current folder that matches the search, sorted by `sentAt`, newest first.
  - Each row has a checkbox and a message button showing the sender, subject and a short snippet of the body.
  - Unread messages look different (for example, bold).
  - An empty list shows `No messages`.
- [ ] **Open:** clicking a message button, or pressing `Enter` on it, opens the message in the reading pane and marks it read. The unread count updates.
  - The reading pane shows the subject as a heading, then the sender, recipient, date and body.
  - With no open message, it shows `No message selected`.
  - If the open message leaves the current view (archived, deleted, or the folder changed), the pane goes back to `No message selected`.
- [ ] **Keyboard triage** (while a message button has focus):
  - `j` or `ArrowDown` moves focus to the next message. `k` or `ArrowUp` moves to the previous one. Stop at the ends, don't wrap.
  - `e` archives the focused message (no-op in Archive). `#` deletes it.
  - `x` toggles the focused message's checkbox.
- [ ] **Focus after removal:** when the focused message is removed (by `e` or `#`), focus moves to the message that took its place (the next one). If it was the last in the list, focus moves to the new last message. If the list is now empty, focus moves to the search box.
- [ ] **Multi-select:**
  - Checking rows selects them.
  - An `Archive selected` button is disabled when nothing is selected. It moves every selected message to Archive and clears the selection.
- [ ] **Search:** a search field labelled `Search mail` filters the current folder by subject, sender or body (case-insensitive substring of the trimmed query). Typing letters like `e` or `j` in the search field must never trigger shortcuts.
- [ ] **State:**
  - Keep the emails in `useReducer`, with actions such as open, archive, delete and bulk archive.
  - Derive the unread counts and the visible list from state during render.
  - The props are read only on mount.

## Non-functional requirements
- **Accessibility:**
  - Folders are inside `<nav aria-label="Folders">`.
  - The message list is a `<ul aria-label="Messages">`. Each `<li>` contains exactly one message `<button>` and one checkbox labelled `Select <subject>`.
  - Use a **roving tabindex** across the message buttons. Only one of them is in the tab order (`tabIndex=0`): the focused one, or the first one when nothing has been focused yet. The rest have `tabIndex=-1`.
  - The reading pane is a `<section aria-label="Reading pane">` (a `region`). The subject is a heading.
  - Unread state is not conveyed by colour or weight alone. Add visually hidden text such as "Unread".
  - Unread counts should read well to screen readers, for example `Inbox, 2 unread`.
- **Keyboard:**

  | Key (focus on a message) | Behaviour |
  |---|---|
  | `j` / `ArrowDown` | Focus the next message (no wrap) |
  | `k` / `ArrowUp` | Focus the previous message (no wrap) |
  | `Enter` | Open the message and mark it read |
  | `x` | Toggle the message's checkbox |
  | `e` | Archive (no-op in Archive) |
  | `#` | Delete permanently |
  | `Tab` | Leave the list. Returning with `Shift+Tab` lands on the last focused message |

- **Performance:**
  - Derive the counts in a single pass over the emails, not one filter per folder per row.
  - Don't re-render every row when only the focused index changes. Stable keys and memoized rows are a good talking point.
  - Aim to handle about 1,000 emails without lag. 10k needs virtualization, which is follow-up 3.
- **UX states:** empty folder, no search results, nothing open.
- **Layout:** a three-column layout that fills its container height. The list and the reading pane scroll independently.

## Constraints
- 90 minutes. React and CSS Modules only. No state, list or hotkey libraries.
- `useReducer` for mailbox state. No `useState` holding a copy of the counts or the filtered list.
- The Playground passes `SAMPLE_EMAILS` from `./data.ts`.
- Keep the public types in `types.ts` unchanged.

## Data / API contract
```ts
type FolderId = 'inbox' | 'sent' | 'archive';

interface Email {
  id: string;
  folder: FolderId;
  from: string;
  to: string;
  subject: string;
  body: string;
  sentAt: string;   // ISO timestamp
  read: boolean;
}

interface EmailClientProps {
  initialEmails: Email[];   // read once on mount
}
```
Default-export the component from `Solution.tsx`.

## Test contract
- Folder buttons are `button`s inside a `navigation` named `Folders`. Each accessible name starts with the folder label (`Inbox`, `Sent`, `Archive`), so tests match `/^Inbox/`. A folder with unread mail contains the count as text. A folder with none contains no digits.
- The current folder's button has `aria-current="page"`.
- The message list is a `list` named `Messages`. Each `listitem` contains exactly one `button` (accessible name includes the subject) and one `checkbox` named `Select <subject>`.
- Tests read row order from the buttons in the list.
- The empty list shows `No messages`.
- The reading pane is a `region` named `Reading pane`. It contains a `heading` whose name is the subject, plus the body text, or the text `No message selected`.
- The search field is found with `getByLabelText('Search mail')`.
- The bulk action is a `button` named `Archive selected` (its name may also include a count, so tests match `/^Archive selected/`).
- Keyboard tests focus a message button and use `user.keyboard('j')`, `'{ArrowDown}'`, `'{Enter}'`, `'e'`, `'#'` and `'x'`. Focus is checked with `toHaveFocus()`.

## Edge cases
- Deleting the open message while focus is elsewhere.
- The search query no longer matches a message after it is opened. *(It stays visible: search matches content, not read state.)*
- A search that hides the focused message: the roving `tabIndex=0` must move to a message that is still visible.
- Bulk archive that includes the focused or open message.
- Two emails with the same `sentAt`: keep a stable order (tie-break by `id`).
- Pressing `#` needs `Shift` on most layouts. Read `event.key`, not `event.code`.
- Holding a modifier: `Ctrl+E`, `Cmd+E` and similar must not archive.

## Follow-ups
1. **Conversations.** Group messages into threads by normalized subject (strip `Re:`/`Fwd:`). The list shows one row per thread with a message count. Archiving archives the whole thread, and the reading pane shows the messages stacked, with only the latest expanded.
2. **Undo archive.** After archiving (by key, bulk or click), show a toast (`role="status"`) that says `Message archived` (or `3 messages archived`) with an `Undo` button. Undo restores the messages to their previous folder. The toast disappears after 5 seconds. A second archive replaces the toast, but the first one must stay archived.
3. **10k emails.** The mailbox now holds 10,000 emails. Virtualize the message list while keeping `j`/`k`, focus after removal and the roving tabindex working, even when the focused row scrolls out of the rendered window.
4. **Compose with draft autosave.** Add a `Compose` button that opens a form (To, Subject, Body). Autosave the draft to `localStorage`, debounced by 1 second, and show `Draft saved`. Restore it when Compose is reopened. `Send` puts the message into Sent.
5. **Server sync.** Mailbox actions now call an API. Make archive and delete optimistic with rollback, and explain how you'd reconcile if another client changed the same message meanwhile.

## Concepts covered
`useReducer` for domain state · derived state (unread counts, filtered and sorted lists) · roving tabindex · focus management after list mutations · keyboard shortcuts with `event.key` and ignoring modifiers · multi-select with a `Set` · three-pane layout with independent scrolling.

Related: S08 Data Table · S04 Virtualized List · S10 Toast System · S13 Selectable Cells · J02 Accordion (roving focus).
