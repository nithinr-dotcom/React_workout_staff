# Rich Text Editor (model-driven)

## Problem statement
Your team owns the comment and description editor used across a work-management product. Today it's a `contenteditable` whose `innerHTML` is saved directly. Pasting from Word brings in `<font>` soup, a pasted `<img onerror>` became a security incident, undo removes one character at a time, and every browser produces different markup for the same keystrokes.

Rebuild it so that **the document model is the source of truth**, not the DOM:

1. **A pure document model.** A document is a list of paragraph blocks. Each block is a list of text runs, and each run carries marks (bold, italic, underline, link). Edits are pure functions `(state) → state`: `insertText`, `deleteBackward`, `splitBlock`, `toggleMark`, `setLink`, plus `getActiveMarks` for the toolbar.
2. **Safe HTML in and out.** `serializeToHTML(doc)` produces canonical, escaped HTML. `parseFromHTML(html)` turns untrusted pasted HTML into a model through an allow-list, dropping scripts and unknown tags.
3. **History.** `createHistory` records states and groups bursts of typing into a single undo step.
4. **A `contenteditable` view.** It intercepts `beforeinput`, runs the command on the model, re-renders from the model and restores the selection. It has a toolbar of toggle buttons (Bold, Italic, Underline, Link) with `aria-pressed`, and supports Ctrl/Cmd+B/I/U and undo/redo shortcuts.

jsdom can't really emulate caret movement, so the tests focus on the model, the history and the toolbar state. Mapping between DOM selections and model positions is verified by hand in the Playground, which has a checklist.

The API design is part of the exercise. `types.ts` is the **minimal contract** that the tests and Playground depend on. Extend it wherever you think the API should be better, but don't break it.

## Clarifying questions to ask
- Which block types? *(Paragraphs only. Headings and lists are follow-ups.)*
- How are positions expressed? *(`{ block, offset }`, where `offset` counts UTF-16 code units in the block's plain text. A selection has an `anchor` and a `focus`, and either may come first.)*
- Which marks does typed text get? *(Stored marks if set. Otherwise the marks of the character before the cursor, or of the character after it at the start of a block. A link is inherited only when the characters on both sides are in the same link, so typing at a link's end doesn't extend it.)*
- What does toggling a mark on a mixed selection do? *(If every selected character already has the mark, remove it. Otherwise add it to all of them.)*
- What does toggling with no selection do? *(It changes the stored marks for the next typed text. The document doesn't change. Any other edit or selection change clears stored marks.)*
- Which links are allowed? *(Absolute `http:`, `https:` and `mailto:` URLs. Anything else (e.g. `javascript:`) is rejected by `setLink`, dropped by `parseFromHTML`, and never emitted by `serializeToHTML`.)*
- How is typing grouped for undo? *(Consecutive edits of the same kind (`typing` or `deleting`) where each comes less than `groupMs` (500 ms) after the previous one form one step. `other` edits and undo/redo always start a new step.)*
- Is a selection change an undo step? *(No. Only changes to the document are recorded.)*

## Functional requirements
**Model invariants**
- [ ] Every command returns a new state and never mutates its input.
- [ ] Documents are normalized: at least one block, no empty runs, no two adjacent runs with equal marks, and marks objects contain only keys that are set (`{ bold: true }`, never `bold: false` or `bold: undefined`). An empty paragraph is `{ type: 'paragraph', runs: [] }`.
- [ ] `createState(doc, selection?)` defaults to a collapsed selection at the end of the last block, with `storedMarks: null`.

**Commands**
- [ ] `insertText(state, text)` deletes the selection if it isn't collapsed, inserts `text` (no line breaks) with the inherited or stored marks, collapses the selection after the inserted text, and clears stored marks.
- [ ] `deleteBackward(state)` deletes the selection if there is one. Otherwise it deletes one code point before the cursor (a surrogate pair counts as one), merges the block into the previous one at a block start, and does nothing at the very start of the document.
- [ ] `splitBlock(state)` deletes the selection, splits the block at the cursor (runs on both sides keep their marks), and puts the cursor at offset 0 of the new block.
- [ ] `toggleMark(state, mark)`, with a selection, adds or removes the mark across every selected character in every block, and keeps the selection unchanged. With a collapsed cursor, it toggles the mark in the stored marks (starting from the active marks).
- [ ] `setLink(state, href)` sets the link on every selected character. `null` or `''` removes links. Unsafe URLs leave the state unchanged. A collapsed selection does nothing.
- [ ] `getActiveMarks(state)`, with a selection, returns the marks shared by every selected character (link only if all have the same href). With a collapsed cursor, it returns the stored marks if set, otherwise the marks the next typed character would get.

**HTML**
- [ ] `serializeToHTML(doc)` emits one `<p>` per block with no separators, and `<p><br></p>` for an empty block.
- [ ] Each run is wrapped independently, outermost to innermost, as `<a href="…">`, `<strong>`, `<em>`, `<u>`. Tags are never shared across runs.
- [ ] Text and attribute values escape `&`, `<`, `>` and `"`. Runs with an unsafe link are emitted without the `<a>`.
- [ ] `parseFromHTML(html)` maps `strong`/`b` → bold, `em`/`i` → italic, `u` → underline, and `a[href]` with a safe URL → link.
- [ ] `p`, `div`, `h1`–`h6`, `li` and `blockquote` start paragraphs. The innermost block wins: a `<div>` containing `<p>`s doesn't add an empty paragraph of its own, but an empty `<p></p>` does become an empty paragraph. Loose inline content between blocks becomes a paragraph only if it has visible text.
- [ ] `<br>` ends the current paragraph. A `<br>` that is the last thing in its block is ignored, so `<p><br></p>` is one empty paragraph.
- [ ] `script`, `style`, `template`, `iframe`, `object`, `embed`, `noscript`, `svg` and `head` content is dropped entirely. Every other tag is unwrapped (its children are kept) and every attribute is ignored.
- [ ] Whitespace: runs of spaces, tabs and newlines collapse to one space, including across element boundaries, and each paragraph's leading and trailing spaces are trimmed.
- [ ] The result is normalized and always has at least one block. `parseFromHTML(serializeToHTML(doc))` equals `doc` for any normalized doc without leading, trailing or double spaces.

**History**
- [ ] `createHistory(initial, { groupMs = 500 })` exposes `current`, `commit(next, kind, time)`, `undo`, `redo`, `canUndo` and `canRedo`.
- [ ] `commit` merges into the current undo step when `kind` isn't `'other'`, equals the previous commit's kind, and `time − previousTime < groupMs`. Otherwise it starts a new step. Every commit clears redo.
- [ ] `undo()` / `redo()` move one step and return the new current state, including the selection it had. With nothing to undo or redo, they return the current state unchanged. After an undo or redo, the next commit starts a new step.

**View (default export)**
- [ ] A `contenteditable` element with `role="textbox"`, `aria-multiline="true"` and `aria-label={label}`, rendered from the model (initially `parseFromHTML(initialHTML)`, cursor at the end).
- [ ] Native `beforeinput` events are cancelled and applied to the model: `insertText` → `insertText` (kind `typing`), `insertParagraph` → `splitBlock` (`other`), `deleteContentBackward` → `deleteBackward` (`deleting`). Paste goes through `parseFromHTML` and inserts the result (`other`).
- [ ] If the DOM selection isn't inside the editor, commands use the model's current selection. DOM selection changes inside the editor update the model selection and clear stored marks.
- [ ] A `role="toolbar"` named `Formatting` contains buttons `Bold`, `Italic`, `Underline` and `Link`, each with `aria-pressed` from `getActiveMarks`. Clicking one must not steal the editor's selection.
- [ ] `Link` calls `promptForLink(currentHref)`. `null` cancels, `''` removes the link, anything else calls `setLink`.
- [ ] Ctrl or Cmd + `B` / `I` / `U` toggle marks. Ctrl/Cmd+`Z` undoes. Ctrl/Cmd+Shift+`Z` and Ctrl+`Y` redo. All of them prevent the browser default.
- [ ] `onChange(doc)` fires after every document change (including undo and redo), but not for selection-only or stored-mark changes.

## Non-functional requirements
- **Security:** the view never renders strings as HTML that didn't come from the model. Paste goes through the allow-list parser. Links are validated in the model, not just in the UI.
- **Accessibility:** follow the [APG Toolbar pattern](https://www.w3.org/WAI/ARIA/apg/patterns/toolbar/) with toggle buttons using `aria-pressed`.

  | Key | Behaviour |
  |---|---|
  | `Tab` | Moves from the toolbar into the editor. Inside the editor, focus doesn't get trapped (`Tab` leaves it). |
  | `ArrowLeft` / `ArrowRight` in the toolbar | Moves between buttons (roving tabindex, nice to have) |
  | Ctrl/Cmd + `B` / `I` / `U` | Toggle bold / italic / underline |
  | Ctrl/Cmd + `Z`, Ctrl/Cmd + Shift + `Z`, Ctrl + `Y` | Undo, redo |
- **Performance:** typing in a 5,000-word document stays under one frame. Re-render only the blocks that changed (structural sharing makes this cheap), and keep commands O(size of affected blocks).
- **Correctness:** the DOM must never drift from the model. If the browser mutates the DOM anyway (spellcheck replacement, autocorrect), re-render from the model.
- **Internationalization:** don't break surrogate pairs. IME composition is a follow-up, but don't make it impossible.

## Constraints
- 120 minutes. React only, with no editor frameworks (ProseMirror, Slate, Lexical, Draft, Quill, TipTap) and no sanitizer libraries.
- `DOMParser` is allowed for parsing. `document.execCommand` isn't.
- No mock API. The Playground renders the editor with sample HTML, a model inspector, a paste sandbox and a manual selection checklist.
- Keep `types.ts` compatible. Add to it freely.

## Data / API contract
```ts
type MarkType = 'bold' | 'italic' | 'underline';
interface Marks { bold?: true; italic?: true; underline?: true; link?: string }
interface TextRun { text: string; marks: Marks }
interface Block { type: 'paragraph'; runs: TextRun[] }
interface Doc { blocks: Block[] }

interface Point { block: number; offset: number }
interface Selection { anchor: Point; focus: Point }
interface EditorState { doc: Doc; selection: Selection; storedMarks?: Marks | null }

type EditKind = 'typing' | 'deleting' | 'other';
interface EditorHistory {
  current(): EditorState;
  commit(next: EditorState, kind: EditKind, time: number): void;
  undo(): EditorState;
  redo(): EditorState;
  canUndo(): boolean;
  canRedo(): boolean;
}

interface RichTextEditorProps {
  label: string;
  initialHTML?: string;
  onChange?: (doc: Doc) => void;
  promptForLink?: (currentHref: string | undefined) => string | null; // default window.prompt
  now?: () => number;                                                  // default Date.now
}

// Named exports from Solution.tsx
function createState(doc: Doc, selection?: Selection): EditorState;
function insertText(state: EditorState, text: string): EditorState;
function deleteBackward(state: EditorState): EditorState;
function splitBlock(state: EditorState): EditorState;
function toggleMark(state: EditorState, mark: MarkType): EditorState;
function setLink(state: EditorState, href: string | null): EditorState;
function getActiveMarks(state: EditorState): Marks;
function serializeToHTML(doc: Doc): string;
function parseFromHTML(html: string): Doc;
function createHistory(initial: EditorState, options?: { groupMs?: number }): EditorHistory;
export default function RichTextEditor(props: RichTextEditorProps): JSX.Element;
```

## Test contract
- The model functions are **named exports**. The editor is the **default export**.
- Model tests build documents literally (`{ type: 'paragraph', runs: [{ text, marks }] }`) and compare results with `toEqual`, so normalization matters. Selections are compared with `toEqual` too.
- `serializeToHTML` is compared as an exact string, so follow the tag order, the `<p><br></p>` rule and the escaping rules exactly.
- `parseFromHTML` is checked with `toEqual` on inputs containing `<script>`, `<style>`, `<img onerror>`, `<span style>`, `<font>`, `onclick`, `javascript:` links, nested `<div><p>`, `<br>` and newline-indented markup.
- History tests call `commit(fn(h.current()), kind, time)` with explicit times and check document text, `selection`, `canUndo` and `canRedo`.
- View tests:
  - find `getByRole('textbox', { name: label })`, `getByRole('toolbar', { name: 'Formatting' })` and buttons by name, and check `aria-pressed="true|false"`;
  - check text with `toHaveTextContent`;
  - use `fireEvent.keyDown(textbox, { key: 'b', ctrlKey: true })` (or `metaKey`, and `shiftKey` for redo);
  - dispatch **native** events: `new InputEvent('beforeinput', { inputType, data, bubbles: true, cancelable: true })`. React's `onBeforeInput` prop is a different, legacy synthetic event and does not fire for these;
  - never place the DOM selection, so commands must fall back to the model's selection (initially the end of the document);
  - pass `now={() => clock}` to control undo grouping, and read `onChange.mock.lastCall[0]`.

## Edge cases
- A backwards selection (focus before anchor), across several blocks.
- Deleting a range that starts and ends in the middle of runs with different marks.
- Backspace right after an emoji or another surrogate pair.
- Toggling a mark on a selection that spans an empty paragraph.
- Typing at the start of a bold run, at the end of a link, and inside a link.
- Pasting HTML with nested blocks, `&nbsp;`, Windows line endings, comments, or only whitespace.
- Double spaces: browsers collapse them when rendering. Decide how the view displays them (`white-space: pre-wrap` or `&nbsp;`).
- Undo immediately after a paste, and redo after typing (redo must be gone).
- The browser mutates the DOM behind your back (spellcheck, IME, a password manager extension).

## Follow-ups
1. **@mentions.** Typing `@` opens a listbox of users filtered by what follows. Arrow keys navigate, and Enter inserts an atomic mention node that Backspace deletes as a whole. How does an atomic inline node change your offsets and runs?
2. **Markdown shortcuts.** Typing `# ` at the start of a paragraph turns it into a heading, `**bold**` becomes bold text, and `- ` starts a list. Undo right after a shortcut restores the literal characters.
3. **Collaborative cursors.** Show other users' selections, updated in real time. How do remote edits move a model position, and how do you render a caret without mutating the editable DOM?
4. **Plugin API.** Let other teams add marks, block types, toolbar buttons, keyboard shortcuts and paste rules without forking the editor. Define the plugin interface and the order conflicts resolve in.
5. **IME composition.** Japanese and Chinese input use `compositionstart` / `compositionupdate` / `compositionend`, where cancelling `beforeinput` breaks input. Let the browser own the DOM during composition and reconcile the model afterwards.

## Concepts covered
Document models (blocks → runs → marks) · normalization invariants · pure, immutable edit commands · stored marks · canonical serialization and escaping · allow-list HTML sanitization · `beforeinput` and `contenteditable` · model ↔ DOM selection mapping · grouped undo history · APG toolbar with `aria-pressed`.

Related: S20 Undo/Redo Drawing Canvas · S35 Transactional KV store · ST18 Collaborative Text Editing (OT-lite) · ST12 Plugin shell.

## Design discussion prompts
- Why make the model the source of truth instead of `innerHTML`? List the bugs each approach makes impossible, and the ones it makes harder.
- Compare your model with ProseMirror (a schema'd tree with marks) and Lexical or Slate (node trees). When does a flat runs-with-marks model stop scaling (tables, nested lists, embeds)?
- How do you map a DOM selection to `{ block, offset }` and back? What breaks with `<br>` placeholders, zero-width characters, or non-editable inline nodes?
- What is your storage format: HTML, model JSON, or Markdown? How would you version the schema and migrate stored documents?
- Undo grouping: time-based, word-boundary-based, or command-based? How does undo interact with collaborative editing?
- How would you test selection behaviour for real, across Chrome, Safari and Firefox (Playwright, `beforeinput` coverage gaps, mobile keyboards)?
- The editor ships in 30 surfaces (comments, descriptions, chat). How do you keep bundle size small and let surfaces opt in to features?
