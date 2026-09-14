# Undo/Redo Drawing Canvas

## Problem statement
Build a `DrawingCanvas` component: a freehand drawing surface with a toolbar. The user draws strokes on a `<canvas>` with a mouse, pen or finger, picks a colour and a brush size, and can **Undo**, **Redo** and **Clear**. Clearing is itself undoable.

The canvas is only a view. The drawing lives in React state as data (a list of strokes, each a list of points), and the pixels are redrawn from that data. This is what makes undo/redo possible, and it's what the tests check through the `onChange(strokes)` prop, because jsdom can't render canvas pixels.

## Clarifying questions to ask
- Is history per stroke or per point? *(Per stroke: one pointer-down → pointer-up gesture is one undo step.)*
- Is Clear undoable? *(Yes. It is one history step, and Undo brings every stroke back.)*
- What happens to Redo after drawing a new stroke following an Undo? *(The redo history is discarded, like in every editor.)*
- Is there a history limit? *(Not in the base version. See the follow-ups.)*
- Do we need an eraser, shapes or export? *(No. Colour, size, undo, redo and clear only.)*
- Should `initialStrokes` be undoable? *(No. They are the starting point of the history.)*

## Functional requirements
- [ ] Render a `<canvas>` of `width` × `height` CSS pixels (defaults 600 × 400) and a toolbar.
- [ ] **Drawing:**
  - Pressing the primary pointer button on the canvas starts a new stroke with the currently selected colour and size, and the press position is its first point.
  - Each `pointermove` while the stroke is in progress adds one point.
  - `pointerup` or `pointercancel` ends the stroke and commits it to history. `pointerup` doesn't add a point.
  - A press and release without moving commits a stroke with a single point, drawn as a dot.
  - `pointermove` with no stroke in progress does nothing.
- [ ] Points are in canvas CSS pixels relative to the canvas's top-left corner: `clientX - rect.left`, `clientY - rect.top`, not rounded.
- [ ] **Colour picker:** one radio button per entry in `colors`, named by its `label`. The first colour is selected initially.
- [ ] **Size picker:** a `<select>` labelled `Brush size` with one option per entry in `sizes` (option value = the number). The second size is selected initially (the first if there is only one).
- [ ] Changing colour or size affects only strokes drawn afterwards.
- [ ] **Undo** reverts the last history step. **Redo** re-applies the last undone step.
- [ ] Committing a new stroke or clearing after an Undo discards the redo history.
- [ ] **Clear** removes every stroke as one undoable step.
- [ ] Disabled states: Undo is disabled when there's nothing to undo, Redo when there's nothing to redo, and Clear when there are no strokes.
- [ ] `initialStrokes` are shown on mount and are the bottom of the history.
- [ ] Call `onChange(strokes)` with the full committed stroke list after every change: commit, undo, redo and clear. Don't call it on mount or during a stroke in progress.
- [ ] The canvas always shows the committed strokes plus the stroke in progress, with round line caps and joins.

## Non-functional requirements
- **Accessibility:**
  - The canvas has `role="img"` and `aria-label="Drawing canvas"`. Drawing itself is pointer-only, which is acceptable for this exercise. Mention it in the interview.
  - The colours are a radio group with the legend `Color`. Each swatch's name is its label, not the hex value.
  - Undo, Redo and Clear are real `<button>`s. Disabled buttons use the `disabled` attribute.
  - Consider announcing history changes ("Undid stroke") in a polite live region.
- **Keyboard:** the shortcuts work wherever focus is on the page, except inside editable text fields.

  | Key | Behaviour |
  |---|---|
  | `Ctrl`/`⌘` + `Z` | Undo |
  | `Ctrl`/`⌘` + `Shift` + `Z` | Redo |
  | `Ctrl` + `Y` | Redo |
  | `Tab` | Move through colour radios, size select and buttons |
  | Arrow keys (in the colour group) | Change colour (native radio behaviour) |

  Prevent the browser's default action when a shortcut is handled.
- **Performance:** `pointermove` can fire more than 120 times per second. Drawing a long stroke must stay smooth on a canvas that already holds hundreds of strokes. Think about what needs to re-render and what needs to be redrawn on each move.
- **Rendering:** `canvas.getContext('2d')` returns `null` in jsdom and in some environments. Guard it: the component must still work as a data model when there's no context.
- **Touch:** drawing on a touch screen must not scroll the page (`touch-action: none`).

## Constraints
- 75 minutes. React, CSS Modules and the Canvas 2D API only. No drawing or state libraries.
- Keep the public types in `types.ts` unchanged.

## Data / API contract
```ts
interface Point { x: number; y: number }
interface Stroke { id: string; color: string; size: number; points: Point[] }
interface ColorOption { label: string; value: string }

interface DrawingCanvasProps {
  width?: number;                 // default 600
  height?: number;                // default 400
  colors?: ColorOption[];         // default DEFAULT_COLORS (Black, Red, Blue, Green)
  sizes?: number[];               // default DEFAULT_SIZES [2, 4, 8, 16]
  initialStrokes?: Stroke[];      // default []
  onChange?: (strokes: Stroke[]) => void;
}
```
Default-export the component from `Solution.tsx`. `DEFAULT_COLORS` and `DEFAULT_SIZES` live in `types.ts`.

## Test contract
- The canvas is found by `getByRole('img', { name: 'Drawing canvas' })`.
- The tests draw with `fireEvent.pointerDown / pointerMove / pointerUp(canvas, { clientX, clientY, button: 0, pointerId: 1 })`. In jsdom, `getBoundingClientRect()` returns zeros, so a point equals `{ x: clientX, y: clientY }`.
- jsdom has no `setPointerCapture`. The tests stub `setPointerCapture`, `releasePointerCapture` and `hasPointerCapture` as no-ops, so you may call them.
- The tests stub `HTMLCanvasElement.prototype.getContext` to return `null`.
- Colour radios: `getByRole('radio', { name: <label> })`. Size: `getByLabelText('Brush size')`, changed with `selectOptions(select, '8')`.
- Buttons are named `Undo`, `Redo` and `Clear`.
- Assertions on the drawing use the **last** `onChange` call: `onChange.mock.lastCall[0]`. Stroke ids are only checked to be strings.
- Shortcuts are sent with `user.keyboard('{Control>}z{/Control}')`, `'{Meta>}{Shift>}Z{/Shift}{/Meta}'` and similar. Note that `event.key` is `'Z'` when Shift is held.

## Edge cases
- Pressing Undo (or the shortcut) while a stroke is still in progress. *(Assume: finish or discard the in-progress stroke first, then undo. Explain your choice.)*
- A second pointer (multi-touch) going down while a stroke is in progress: ignore it (track `pointerId`).
- The pointer leaving the canvas mid-stroke, and releasing outside the browser window.
- Clear on an already empty canvas must not add a history step (the button is disabled anyway, but guard the handler).
- Resizing `width`/`height` must not lose the drawing, because the drawing is data.
- High-DPI screens: a 600×400 canvas looks blurry when `devicePixelRatio` is 2 (follow-up 1).

## Follow-ups
1. **Crisp on retina.** Scale the canvas backing store by `devicePixelRatio` while keeping the CSS size and point coordinates unchanged. Handle the ratio changing when the window moves between screens.
2. **Bounded history.** Cap history at 50 steps. Then compare storing full snapshots with storing commands (`add stroke`, `clear`) in memory and time. Which one makes Clear cheap to undo?
3. **Smooth lines.** Render strokes with quadratic curves through the midpoints instead of straight segments, and drop points closer than 2px to the previous one.
4. **Eraser and export.** Add an eraser tool that stays undoable, and an "Export PNG" button. Does the eraser remove whole strokes or paint pixels? What does each choice do to the data model?
5. **Collaborative drawing.** Two users draw on the same canvas over a socket. What happens to undo? (Hint: undo only your own strokes. Discuss operation-based history vs a shared stack.)

## Concepts covered
Past / present / future history stacks · immutable updates · `useReducer` for state transitions · pointer events and pointer capture · refs for high-frequency interaction state · canvas rendering derived from state · global keyboard shortcuts with cleanup · disabled states derived from state.

Related: S18 Kanban Board · S12 Sortable List · S35 Transactional KV store.
