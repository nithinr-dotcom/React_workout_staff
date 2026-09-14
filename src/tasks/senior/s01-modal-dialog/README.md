# Modal Dialog

## Problem statement
Build a reusable `Modal` component for a design system. The parent controls it with `open` and `onClose`. When open, it shows a titled dialog above the page with a dimmed backdrop. It must behave like a real modal for keyboard and screen-reader users: focus moves into the dialog, can't escape it with Tab, and goes back to where it was when the dialog closes. The page behind must not scroll.

This is a classic senior screen because every line of it is about **side effects and cleanup**: portals, document-level listeners, focus, and body styles.

## Clarifying questions to ask
- Is the modal controlled or does it own its open state? *(Controlled: the parent passes `open` and decides what `onClose` does.)*
- Where should it render in the DOM? *(In a portal attached to `document.body`, so parent `overflow: hidden` or `z-index` stacking can't clip it.)*
- Which element gets focus when it opens? *(The first focusable element inside the dialog, in DOM order. The Close button counts.)*
- What if the dialog has no focusable content? *(Focus the dialog container itself. It needs `tabIndex={-1}` for that.)*
- Should a backdrop click close it? *(Yes by default. `closeOnBackdropClick={false}` turns that off, e.g. for forms with unsaved data.)*
- Can I use the native `<dialog>` element? *(Not for this exercise. Build the behaviour yourself so you understand it. Discuss `<dialog>` as a follow-up.)*
- Animations? *(Not required.)*

## Functional requirements
- [ ] When `open` is `false`, render nothing.
- [ ] When `open` is `true`, render a backdrop and a dialog **in a portal attached to `document.body`**.
- [ ] The dialog shows `title` as a heading and renders `children` below it.
- [ ] The dialog has a visible **Close** button that calls `onClose`.
- [ ] When the dialog opens, focus moves to the first focusable element inside it (or to the dialog itself if there is none).
- [ ] **Focus trap:** `Tab` from the last focusable element wraps to the first; `Shift+Tab` from the first wraps to the last. Focus never lands on the page behind.
- [ ] `Escape` calls `onClose`.
- [ ] Clicking the backdrop calls `onClose`, unless `closeOnBackdropClick` is `false`. Clicking inside the dialog never closes it.
- [ ] **Scroll lock:** while open, `document.body.style.overflow` is `hidden`. On close or unmount, it is restored to its previous value.
- [ ] **Focus restore:** when the dialog closes, focus returns to the element that was focused before it opened (usually the trigger button).

## Non-functional requirements
- **Accessibility:** follow the [WAI-ARIA Dialog (Modal) pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/).
  - The dialog element has `role="dialog"` and `aria-modal="true"`.
  - It has `aria-labelledby` pointing at the title heading's id. Use `useId`.
  - The backdrop is decorative: it isn't focusable and has no role.
- **Keyboard:**

  | Key | Behaviour |
  |---|---|
  | `Tab` | Move focus to the next focusable element in the dialog; wrap from last to first |
  | `Shift+Tab` | Move focus to the previous focusable element; wrap from first to last |
  | `Escape` | Call `onClose` |
  | `Enter` / `Space` on Close | Call `onClose` (native button behaviour) |
- **No leaks:** every document listener, body style and stored focus reference is cleaned up on close and on unmount. Opening and closing 50 times must leave the page in its original state.
- **Styling:** the backdrop covers the viewport and dims the page. The dialog is centred, has a max width, and scrolls internally if its content is taller than the viewport.

## Constraints
- 60 minutes. React and CSS Modules only. No focus-trap or dialog libraries, and no native `<dialog>`.
- Keep the public types in `types.ts` unchanged.

## Data / API contract
```ts
interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children?: ReactNode;
  closeOnBackdropClick?: boolean; // default true
}
```
Default-export the component from `Solution.tsx`.

## Test contract
- When open, there is exactly one `dialog` whose accessible name is `title`, with `aria-modal="true"`.
- When closed, `queryByRole('dialog')` returns `null`.
- The dialog is **not** inside the element the component was rendered into, but is inside `document.body`.
- The Close control is a `button` named `Close` inside the dialog.
- The **backdrop is the dialog's direct parent element**. Tests click `dialog.parentElement` to simulate a backdrop click.
- Tests press `Tab` / `Shift+Tab` repeatedly with `user-event` and expect `document.activeElement` to stay inside the dialog.
- Tests check `document.body.style.overflow` equals `'hidden'` while open and its previous value after closing.
- Tests open the modal from a button named `Open settings` and expect that button to have focus after closing.

## Edge cases
- The dialog's content changes while it's open (e.g. a button is added). The trap must use the current focusable elements, not a list captured on open.
- Disabled buttons, `tabindex="-1"` elements and hidden inputs aren't tabbable. Skip them.
- A drag that starts inside the dialog and ends on the backdrop (selecting text) should not close it.
- `open` flips to `false` through a parent action rather than `onClose`. Cleanup and focus restore must still happen.
- The component unmounts while open (route change). The body scroll lock must be released.
- The element that had focus before opening was removed from the page. Don't throw when restoring.
- Some other code already set `body.style.overflow`. Restore that value, not an empty string.

## Follow-ups
1. **Nested modals.** A modal opens a second confirm modal. Only the top-most one reacts to `Escape` and traps focus. Closing it returns focus inside the first modal. The scroll lock is released only when the last modal closes. How do you coordinate the stack without a global singleton leaking between tests?
2. **Initial focus and return focus props.** Add `initialFocusRef` and `returnFocusRef` so consumers can focus e.g. the "Cancel" button of a destructive confirmation.
3. **Inert background.** Screen-reader virtual cursors ignore focus traps. Make everything outside the portal `inert` (or `aria-hidden`) while the modal is open, and undo it precisely on close.
4. **Native `<dialog>`.** Re-implement with `showModal()`. What do you get for free (top layer, `::backdrop`, `inert` background, Escape) and what do you still need to handle?
5. **Enter / exit animations.** Animate opening and closing. The dialog must stay mounted during the exit animation and the focus restore must still happen after it finishes.

## Concepts covered
`createPortal` · effect setup and cleanup ordering · document-level `keydown` listeners · focus trap by querying tabbable elements · `useId` for `aria-labelledby` · body scroll lock with restore · saving and restoring `document.activeElement`.

Related: J02 Accordion · S10 Toast Notification System · S11 Multi-select Dropdown · S14 Date Picker.
