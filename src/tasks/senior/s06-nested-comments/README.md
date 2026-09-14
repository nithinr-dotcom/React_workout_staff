# Nested Comments

## Problem statement
Build a Reddit-style comment thread. Users can reply to any comment at any depth. They can edit and delete their own comments, upvote any comment, collapse a thread, and sort the discussion by *Top* or *Newest*. The component receives the initial thread as a nested tree and owns all changes after that. There is no backend.

Interviewers use this round to see how you model recursive data. Updating a deeply nested reply should not mean hand-writing a recursive copy of the whole tree for every action. They also look at how you keep inline forms, sorting and deletion rules consistent.

## Clarifying questions to ask
- Who can edit or delete a comment? *(Only its author, meaning `author === currentUser`. Anyone can reply or upvote.)*
- What happens when a deleted comment has replies? *(It stays in place as a `[deleted]` placeholder so the replies keep their context. A comment with no replies disappears completely.)*
- If a placeholder loses its last reply, does it stay? *(No. It is removed too, and this rule repeats up the tree.)*
- Is voting a counter or a toggle? *(A toggle: the current user can add one upvote per comment and take it back. Downvotes are a follow-up.)*
- Does sorting apply to replies too? *(Yes, at every level.)*
- Can several reply or edit forms be open at once? *(No. Opening one closes any other inline form. The top-level composer is always visible.)*
- Is there a maximum depth? *(No limit in the data. The visual indentation may stop growing after a few levels.)*

## Functional requirements
- [ ] Render `initialComments` as a nested thread. Each comment shows its author, text, creation date and vote count.
- [ ] A heading shows the number of comments, not counting `[deleted]` placeholders: `N comments`, or `1 comment`.
- [ ] A **Sort by** select offers *Top* (default) and *Newest*, and applies at every level.
  - *Top:* most votes first. Ties go to the older comment first.
  - *Newest:* most recent `createdAt` first.
- [ ] A top-level composer adds a new root comment. The submit button is disabled while the text is blank. The composer clears after posting.
- [ ] **Reply** opens an inline form under that comment. Posting adds a reply by `currentUser` with 0 votes and `createdAt = now()`, then closes the form. If the thread was collapsed, it expands.
- [ ] **Edit** (own comments only) swaps in an inline form pre-filled with the current text. Saving updates the text and shows `(edited)`. Cancelling keeps the text unchanged.
- [ ] **Delete** (own comments only):
  - A comment **with replies** becomes a placeholder. It shows the text `[deleted]`, hides its author and votes, and has no Reply, Edit, Delete or Upvote actions. Its replies stay visible.
  - A comment **without replies** is removed. If its parent is a placeholder that now has no replies, the parent is removed too, repeating upwards.
- [ ] **Upvote** toggles the current user's vote: +1 when pressed, −1 when un-pressed.
- [ ] A comment with replies has a toggle that hides or shows its whole subtree. While collapsed, it states how many replies are hidden, counting all descendants.
- [ ] Only one inline form (reply or edit) is open at a time. `Escape` closes it, and `Ctrl`/`Cmd` + `Enter` submits it.
- [ ] With no comments at all, render `No comments yet`.

## Non-functional requirements
- **Accessibility:**
  - Each comment is an `<article>` labelled with its author, for example `Comment by ben`.
  - The collapse toggle is a button with `aria-expanded`. The upvote button uses `aria-pressed`.
  - Every textarea has an accessible name.
  - When an inline form opens, its textarea gets focus. When it closes, by submit, cancel or `Escape`, focus returns to the button that opened it.
- **Keyboard:**

  | Key | Behaviour |
  |---|---|
  | `Tab` | Moves through the comment actions in reading order (native buttons) |
  | `Enter` / `Space` on an action | Activates it |
  | `Escape` in an inline form | Cancels and returns focus to the opener |
  | `Ctrl`/`Cmd` + `Enter` in any textarea | Submits that form (when not blank) |
- **Performance:** voting on or editing a comment five levels deep must not re-create every comment object in the thread. Sorting is derived during render and memoised, never stored in state.
- **UX:** indent replies with a thread line, format dates with `Intl.DateTimeFormat`, and trim whitespace before saving.

## Constraints
- 75 minutes. React and CSS Modules only. No state or date libraries.
- Use `COMMENTS` from `src/mocks/data/datasets.ts` in the Playground. You don't need `getComments` (see the follow-ups).
- Keep `types.ts` unchanged.

## Data / API contract
```ts
interface CommentNode {
  id: string;
  author: string;
  text: string;
  createdAt: string;      // ISO 8601
  votes: number;
  replies: CommentNode[];
}

type CommentSort = 'top' | 'newest';

interface NestedCommentsProps {
  initialComments: CommentNode[];
  currentUser: string;
  now?: () => Date;       // default () => new Date()
}
```
Default-export the component from `Solution.tsx`. Generate ids for new comments however you like.

## Test contract
- **Each comment:** an `article` that contains **only that comment's own content and actions**. Render its replies outside the article, for example in a sibling list. Document order of articles equals visual order.
- **Inside a comment's article:**
  - its text
  - the vote count as the text `N votes` (or `1 vote`)
  - `(edited)` after an edit
- **Buttons inside a comment's article:**
  - `Upvote`, with `aria-pressed`
  - `Reply`
  - `Edit` and `Delete`, only on the current user's own comments
  - `Hide replies` (expanded) or `Show N replies` / `Show 1 reply` (collapsed), only when the comment has replies, with `aria-expanded`
- **Placeholder:** the article contains the text `[deleted]` and none of the buttons above except the replies toggle.
- **Heading:** `N comments` / `1 comment`.
- **Sort:** a `combobox` named `Sort by`, with options `Top` and `Newest`.
- **Top-level composer:** textbox `Add a comment` and button `Post comment`.
- **Reply form:** textbox `Reply to {author}`, buttons `Post reply` and `Cancel`.
- **Edit form:** textbox `Edit comment`, buttons `Save` and `Cancel`.
- Submit buttons are disabled while their textbox is blank.
- **Empty state:** the text `No comments yet`.

## Edge cases
- Deleting a comment that has a reply form open, either on it or on one of its descendants.
- Deleting the only reply of a placeholder, which removes the placeholder too. Does this cascade several levels?
- Replying to a comment whose thread is collapsed.
- Editing to the same text, or to whitespace only.
- Two authors with the same text. Never use text or author as a key.
- Upvoting a comment changes its position under *Top*. The page must not lose focus or scroll wildly.

## Follow-ups
1. **Load from the API.** Fetch the thread with `getComments()`. Add loading and error states with a retry. Make posting a reply optimistic, with rollback if a (mocked) save fails.
2. **Load more replies.** Deep or long threads show only the first 3 replies, with a `Load N more` button. Lazily render subtrees below depth 5 behind `Continue this thread →`.
3. **Downvotes and scores.** Add up and down votes as mutually exclusive toggles. Add a *Controversial* sort. Where does the voting state live if the thread is also shown elsewhere on the page?
4. **Mentions and markdown.** Support `@username` autocomplete in the composer (see S02) and render a safe subset of markdown. How do you avoid XSS?
5. **Real-time.** New replies from other users arrive over a socket. Don't reorder the thread under the reader's cursor. Show a `3 new replies` pill instead.

## Concepts covered
Recursive components · normalizing a tree into `byId` + `childIds` + `parentId` · reducer actions that touch O(depth) objects instead of O(n) · deriving sorted children with `useMemo` · delete-with-placeholder semantics · single active inline form · restoring focus to the opener.

Related: S05 File Explorer · S07 Nested Checkboxes · S18 Kanban Board (normalized state).
