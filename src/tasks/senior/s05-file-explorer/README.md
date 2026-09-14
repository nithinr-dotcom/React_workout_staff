# File Explorer

## Problem statement
Build the sidebar file tree from a code editor. It receives a nested tree of files and folders. Users can expand and collapse folders, create files and folders, rename anything inline, and delete items after confirming. The whole tree must be usable with the keyboard alone and announced correctly by screen readers.

This is one of the most common senior machine-coding rounds. Interviewers watch how you model the tree, how you keep operations like "rename" and "delete a folder" simple, and whether keyboard focus stays sensible after every change.

## Clarifying questions to ask
- Do folders start expanded or collapsed? *(Collapsed, except ids passed in `defaultExpandedIds`.)*
- How are siblings ordered? *(Folders first, then files. Within each group, case-insensitive natural order: `page2` before `page10`.)*
- Does the parent need the updated tree? *(Not for now. The component owns the tree after mount. See the follow-ups.)*
- Can two siblings share a name? *(No. Names are unique among siblings, compared case-insensitively.)*
- Should delete ask for confirmation? *(Yes, an inline confirmation inside the tree. Don't use `window.confirm`.)*
- Is there a "selected" file separate from keyboard focus? *(Yes. Activating a file selects it and calls `onSelect`. Focus can move without changing the selection.)*
- Do we persist changes? *(No.)*

## Functional requirements
- [ ] Render `initialTree` as a tree. Folders show their children only when expanded.
- [ ] Sort siblings at every level: folders first, then files, each group in case-insensitive natural order. Sorting must still hold after creating or renaming.
- [ ] Clicking a folder toggles it. Clicking a file selects it and calls `onSelect(node)`.
- [ ] Every folder row has **New file** and **New folder** actions. There are also root-level actions to create items at the top level.
- [ ] Creating shows an inline name input in the target folder, which expands if needed. `Enter` creates the item, `Escape` cancels. A blank name cancels.
- [ ] Every row has a **Rename** action that swaps the name for an inline input pre-filled with the current name. `Enter` saves, `Escape` cancels, and a blank or unchanged name keeps the old name.
- [ ] Invalid names keep the input open and show an error: a duplicate sibling name (case-insensitive, ignoring the item being renamed) or a name containing `/`.
- [ ] Every row has a **Delete** action that shows an inline confirmation. Confirming removes the item, including all descendants for a folder. Cancelling or pressing `Escape` keeps it.
- [ ] An empty tree renders the text `No files`. An expanded folder with no children shows `Empty folder`.
- [ ] Focus is never lost to `<body>`. After create or rename, focus moves to the affected item. After cancelling, focus returns to the item the action started from. After a delete, focus moves to the nearest remaining visible item.

## Non-functional requirements
- **Accessibility:** follow the [WAI-ARIA Tree View pattern](https://www.w3.org/WAI/ARIA/apg/patterns/treeview/) (single-select).
  - The container has `role="tree"` and an accessible name.
  - Each node has `role="treeitem"`, `aria-level` (1 for root items), and `aria-selected`. Folders also have `aria-expanded`.
  - An expanded folder's children sit inside a `role="group"` element.
  - Roving tabindex: exactly one treeitem is in the tab order (`tabIndex=0`). All the others have `-1`.
- **Keyboard** (when a treeitem has focus):

  | Key | Behaviour |
  |---|---|
  | `ArrowDown` / `ArrowUp` | Move focus to the next / previous *visible* item (no wrapping) |
  | `ArrowRight` | Closed folder: expand it. Open folder: focus its first child. File: do nothing |
  | `ArrowLeft` | Open folder: collapse it. Otherwise: focus the parent folder |
  | `Home` / `End` | Focus the first / last visible item |
  | `Enter` | Folder: toggle it. File: select it |
  | `F2` | Rename the focused item |
  | `Delete` | Ask to delete the focused item |
  | `Escape` (inside an input or confirmation) | Cancel and return focus to the item |
- Keys typed into an inline input must not trigger tree navigation.
- **Performance:** a rename or toggle must not rebuild or deep-clone the whole tree. Sorting is derived at render time and memoised, never stored.
- **Styling:** indentation per level, folder and file icons, a chevron that rotates for expanded folders, a visible focus ring, and a highlighted selected row. Row actions may appear on hover or focus, but they must stay reachable.

## Constraints
- 75 minutes. React and CSS Modules only. No tree or UI libraries.
- Data comes in through props. Use `FILE_TREE` from `src/mocks/data/datasets.ts` in the Playground. No network needed.
- Keep `types.ts` unchanged.

## Data / API contract
```ts
interface FileNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  children?: FileNode[]; // folders only; may be empty
}

interface FileExplorerProps {
  initialTree: FileNode[];
  defaultExpandedIds?: string[];          // default []
  onSelect?: (node: FileNode) => void;    // files only
}
```
Default-export the component from `Solution.tsx`. Generate ids for new nodes however you like. They only need to be unique.

## Test contract
- The tree: `getByRole('tree', { name: 'Files' })`.
- Each node: `treeitem` whose accessible name is exactly the node's `name` (use `aria-label`, because a treeitem's content includes its children). It has `aria-level`, `aria-selected`, and `aria-expanded` (folders only).
- The document order of `treeitem`s matches the visual order.
- Buttons, where `{name}` is the node name:
  - `New file in {name}` and `New folder in {name}`: folders only
  - `New file at root` and `New folder at root`
  - `Rename {name}` and `Delete {name}`
- Create input: `textbox` named `New file name` or `New folder name`. It is focused when it appears.
- Rename input: `textbox` named `New name for {name}`, pre-filled and focused.
- Validation error: an element with `role="alert"` whose text contains `already exists` for duplicates.
- Delete confirmation: `alertdialog` named `Delete {name}?`, containing buttons `Delete` and `Cancel`. `Escape` also cancels.
- Empty tree: the text `No files`.
- Collapsed children are not in the DOM, or are hidden.

## Edge cases
- Renaming a folder must not break its children, and it must not collapse the folder.
- Renaming `App.tsx` to `app.tsx` (only the case changes) is allowed. Renaming to a sibling's name in another case is not.
- Deleting the focused item, the selected item, or a folder that contains the selected item.
- Creating an item inside a collapsed folder expands it first.
- Deleting the last child of a folder should show `Empty folder`, not an empty expanded group.
- Two explorers on one page must not share ids or focus state.
- `initialTree` can contain folders without a `children` key. Treat them as empty.

## Follow-ups
1. **Controlled tree.** Add `onChange(tree: FileNode[])` so a parent can persist the tree. Should the component emit the nested shape or your internal shape? Where do you convert between them, and how often?
2. **Drag and drop.** Move files and folders into other folders with drag and drop. Prevent dropping a folder into itself or into one of its descendants, and re-check name collisions at the target.
3. **Lazy loading.** Folders load their children on first expand from `getFileTree`-like async calls. Show a loading row, handle errors with a retry, and handle collapsing before the response arrives.
4. **Huge trees.** A repository has 50,000 nodes. Flatten the visible nodes and virtualize them (see S04). What happens to `aria-level`, `aria-setsize` and `aria-posinset`?
5. **Type-ahead and multi-select.** Typing characters focuses the next item that starts with them. `Shift`/`Cmd`-click selects several items for a bulk delete.

## Concepts covered
Normalized tree state (`byId` + `childIds` + `parentId`) · recursive rendering · deriving a flattened "visible items" list for keyboard navigation · roving tabindex · focus restoration after DOM changes · inline edit forms · natural sorting with `Intl.Collator`.

Related: J02 Accordion · J03 Tabs (roving focus) · S07 Nested Checkboxes · S04 Virtualized List.
