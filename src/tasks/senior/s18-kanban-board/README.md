# Kanban Board

## Problem statement
Build a Trello/Jira-style `KanbanBoard`. The board has columns (by default **Todo**, **In Progress** and **Done**) and each column holds an ordered list of cards. Users can add a card to any column, rename a card inline, delete it, and move it to another column. Moving works in two ways: dragging a card with the mouse, and an accessible per-card "Move to…" select for keyboard and screen-reader users. The board survives a page reload.

This is the classic Atlassian round. The interviewer cares less about pixels and more about how you shape the state, how moves stay consistent, and whether drag and drop has a real accessible alternative.

## Clarifying questions to ask
- Are columns fixed, or can users add/rename columns? *(Fixed for the base version. They come from `initialBoard`.)*
- Where does a moved card land in its new column? *(At the bottom, when moved with the select. Dropping onto a specific card is a follow-up.)*
- Should delete ask for confirmation? *(No. Delete immediately. Undo is a follow-up.)*
- Is there a backend? *(No. Persist to `localStorage` only.)*
- If stored data exists and `initialBoard` is also passed, which wins? *(Stored data, as long as it is valid.)*
- Can two cards have the same title? *(Yes. Always key by id.)*

## Functional requirements
- [ ] Render one column per entry in `columnOrder`, left to right, each showing its title, its card count, and its cards in `cardIds` order.
- [ ] A column with no cards shows the text `No cards`.
- [ ] Each column has an input and an **Add card** button. Submitting (button or `Enter`) appends a card with the trimmed title to the bottom of that column and clears the input. Blank or whitespace-only titles are ignored.
- [ ] Each card has an **Edit** button that swaps the title for a text input pre-filled with the current title. `Enter` or blurring the input saves; `Escape` cancels. Saving a blank title keeps the old title.
- [ ] Each card has a **Delete** button that removes the card immediately.
- [ ] Each card has a "Move to…" `<select>` listing every column by title, with the card's current column selected. Choosing another column moves the card to the **bottom** of that column.
- [ ] Cards can be dragged with the mouse (HTML5 drag and drop) and dropped on another column, landing at the bottom of it.
- [ ] Keep state normalized (`BoardState` in `types.ts`). A card id must appear in exactly one column at all times.
- [ ] Persist the whole board as JSON to `localStorage` under `storageKey` (default `"kanban-board"`) on every change.
- [ ] On mount, use the stored board if it exists and parses into a valid `BoardState`; otherwise fall back to `initialBoard`, and then to three empty columns: `Todo`, `In Progress`, `Done`.

## Non-functional requirements
- **Accessibility:**
  - Each column is a landmark: a `<section>` labelled by its heading, so it is a `region` named after the column title.
  - Cards are list items inside a list.
  - Icon-only buttons still need a text name that includes the card title, so a screen-reader user knows *which* card "Delete" applies to.
  - Drag and drop is mouse-only, so the move select is the required accessible path. It is not optional.
  - After moving a card with the select, focus should follow the card to its new column. After finishing an inline edit, focus returns to the card's Edit button.
- **Keyboard:**

  | Key | Where | Behaviour |
  |---|---|---|
  | `Enter` | Add-card input | Add the card |
  | `Enter` | Edit input | Save the new title |
  | `Escape` | Edit input | Cancel the edit and restore the old title |
  | `Tab` | Anywhere | Reach every card control in visual order |
- **Performance:** a move touches at most two columns. Don't clone every card on every action.
- **UX:** show a visual cue while dragging (dimmed card, highlighted target column). Show the card count next to each column title.

## Constraints
- 90 minutes. React, CSS Modules and the native Drag and Drop API only. No DnD libraries.
- No mock API is needed. Persist with `localStorage`.
- Keep `types.ts` unchanged.

## Data / API contract
```ts
interface KanbanCard { id: string; title: string }
interface KanbanColumn { id: string; title: string; cardIds: string[] }
interface BoardState {
  columnOrder: string[];
  columns: Record<string, KanbanColumn>;
  cards: Record<string, KanbanCard>;
}
interface KanbanBoardProps {
  initialBoard?: BoardState;
  storageKey?: string; // default "kanban-board"
}
```
Default-export the component from `Solution.tsx`. The value stored in `localStorage` is `JSON.stringify(board)` with the `BoardState` shape.

## Test contract
- Each column is a `region` whose accessible name is exactly the column title (`Todo`, `In Progress`, `Done`).
- Inside a column, cards are `listitem`s; each list item's text contains the card title.
- An empty column contains the text `No cards`.
- Add-card input: a `textbox` named `New card in <column title>`, e.g. `New card in Todo`. The button inside the same column is named `Add card`.
- Per card:
  - `button` named `Edit <card title>`. While editing, a `textbox` named `Card title` is shown.
  - `button` named `Delete <card title>`.
  - `combobox` (a native `<select>`) named `Move <card title>`. Its options' text is the column titles, and its displayed value is the current column title.
- Tests read `localStorage.getItem('kanban-board')` (or the custom `storageKey`) and seed it before rendering.
- Drag and drop is not tested because jsdom has no layout. Check it by hand in the Playground.

## Edge cases
- Stored JSON that is corrupt, or valid JSON with the wrong shape, must not crash the board. Fall back to `initialBoard`.
- `localStorage` may throw (Safari private mode, quota exceeded). The board must still work in memory.
- Choosing the current column in the select is a no-op.
- Dropping a card onto the column it came from shouldn't duplicate it.
- Two cards with identical titles must stay independent.
- Deleting a card that is being dragged, or editing a card that gets moved.

## Follow-ups
1. **Reorder within a column.** Add `Move <card title> up` and `Move <card title> down` buttons to each card. They are disabled on the first and last card. Keep focus on the button that was pressed as the card moves.
2. **Drop position.** When dragging, show an insertion line and drop the card *before* the card under the pointer, both within a column and across columns.
3. **Undo delete.** Show a toast with an "Undo" button for 5 seconds after a delete, restoring the card at its original index. What happens if two deletes happen within 5 seconds?
4. **Cross-tab sync.** Keep two open tabs in sync: when another tab writes the same `storageKey`, this board updates without a reload. Why doesn't the `storage` event fire in the tab that wrote the value?
5. **Server sync.** Moves are sent to `PATCH /cards/:id` optimistically. How do you roll back one failed move while later moves succeed? How would you order cards so that two users moving concurrently don't conflict (fractional indexing / LexoRank)?

## Concepts covered
Normalized state (`columns` hold ids, `cards` hold data) · `useReducer` with pure, testable transitions · the HTML5 Drag and Drop events (`dragstart`, `dragover` + `preventDefault`, `drop`) · providing an accessible alternative to drag · lazy `useReducer` initialisation from `localStorage` with validation · focus management after DOM moves.

Related: J01 Todo List · S12 Sortable Drag & Drop List · S10 Toast Notification System · S06 Nested Comments (normalized state).
