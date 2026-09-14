# Image Gallery with Lightbox

## Problem statement
Build an `ImageGallery` for a travel blog post. It shows a responsive grid of thumbnails. Activating a thumbnail opens a **lightbox**: a modal dialog with the large image, its caption, a `"3 / 12"` position counter and Previous/Next controls. The user can move through photos with the buttons or the arrow keys, and close the lightbox with `Escape` or the Close button. When it closes, focus returns to the grid, to the thumbnail of the photo they were last looking at.

The lightbox is a modal dialog, so it must behave like one: focus moves into it, `Tab` can't escape it, and the page behind can't be interacted with.

## Clarifying questions to ask
- Does Next wrap from the last photo to the first? *(Yes, in both directions.)*
- The user opens photo 2, moves to photo 5, then closes. Which thumbnail gets focus? *(Photo 5's, so the grid position matches what they last saw.)*
- Where does focus go when the lightbox opens? *(Into the dialog. The Close button is a good choice.)*
- Does clicking the dark backdrop close it? *(Yes, but it isn't tested.)*
- With a single photo, are Previous/Next shown? *(No. Don't render them, and the arrow keys do nothing.)*
- Can I use the native `<dialog>` element? *(Yes, if you can explain how `showModal()` affects focus, `Escape` and the top layer. jsdom's support for it is incomplete, so a `div role="dialog"` is the safer choice for passing tests.)*
- Should images be lazy-loaded? *(Thumbnails: yes, with `loading="lazy"`. Preloading neighbours is follow-up 1.)*

## Functional requirements
- [ ] Render the thumbnails as a list labelled `label` (default `Photo gallery`), one `<button>` per image. Each button contains the thumbnail `<img>` with the image's `alt`.
- [ ] With an empty `images` array, render the text `No photos`.
- [ ] Clicking a thumbnail (or pressing `Enter`/`Space` on it) opens the lightbox on that photo.
- [ ] The lightbox is a dialog named `Photo viewer` with `aria-modal="true"`. It shows the large image (`src`, with `alt`), the caption if there is one, and a counter in the format `<n> / <total>` (1-based, e.g. `3 / 12`).
- [ ] `Next photo` and `Previous photo` buttons move through the photos, wrapping at both ends. `ArrowRight` and `ArrowLeft` do the same while focus is inside the dialog.
- [ ] With exactly one photo, the Previous/Next buttons are not rendered, and the arrow keys do nothing.
- [ ] `Escape` and the `Close` button close the lightbox. Focus moves to the thumbnail button of the photo that was showing.
- [ ] When the lightbox opens, focus moves inside it. While it's open, `Tab` and `Shift+Tab` cycle through the dialog's focusable elements and never leave it.
- [ ] Clicking the backdrop closes the lightbox (not tested).
- [ ] While open, the page behind doesn't scroll (not tested).

## Non-functional requirements
- **Accessibility:** follow the [WAI-ARIA Dialog (Modal) pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/).
  - The dialog has `role="dialog"`, `aria-modal="true"` and an accessible name.
  - The counter and caption are announced when the photo changes. Consider a polite live region that doesn't also re-announce on open.
  - Thumbnail buttons are named by the image's alt text. Don't add a redundant "button" or "image" to the name.
  - Controls use icons (‹ › ×) with accessible names, and the icon glyphs are `aria-hidden`.
- **Keyboard:**

  | Key | Behaviour |
  |---|---|
  | `Enter` / `Space` on a thumbnail | Open the lightbox on that photo |
  | `ArrowRight` / `ArrowLeft` | Next / previous photo, wrapping (no-op with one photo) |
  | `Tab` / `Shift+Tab` | Cycle focus inside the dialog |
  | `Escape` | Close and focus the current photo's thumbnail |
- **UX states:** the large image area keeps a stable size while the next image loads, so the controls don't jump. Show the caption under the image, or the alt text if there is no caption.
- **Styling:** a responsive grid (`auto-fill`, `minmax`) with `object-fit: cover` square thumbnails. The lightbox image is `object-fit: contain` within the viewport. There's a visible focus ring on dark backgrounds.

## Constraints
- 45 minutes. React and CSS Modules only. No lightbox, dialog or focus-trap libraries.
- Keep the public types in `types.ts` unchanged.

## Data / API contract
```ts
interface GalleryImage {
  id: string;
  src: string;
  thumbSrc?: string;   // falls back to src
  alt: string;
  caption?: string;
}
interface ImageGalleryProps {
  images: GalleryImage[];
  label?: string;      // default "Photo gallery"
  syncUrl?: boolean;   // follow-up 3
}
```
Default-export the component from `Solution.tsx`.

## Test contract
- The grid is a `list` named `label` (or `Photo gallery`). Each thumbnail is a `button` whose accessible name is exactly the image `alt`.
- An empty gallery renders the text `No photos`.
- When closed, `queryByRole('dialog')` is `null`. When open, there is one `dialog` named `Photo viewer` with `aria-modal="true"`.
- Inside the dialog, tests look for an `img` named by the current `alt`, with the current `src`. They look for the counter text, e.g. `2 / 4`, and `button`s named `Previous photo`, `Next photo` and `Close`.
- Arrow-key tests press keys with `user.keyboard` while focus is inside the dialog.
- The focus trap test presses `Tab` and `Shift+Tab` several times, and expects `document.activeElement` to stay inside the dialog.
- Focus return is checked with `toHaveFocus()` on the thumbnail `button`.
- Follow-up 3 tests set the URL with `history.replaceState` before rendering, and read `window.location.search`. They wait with `waitFor`, so either `pushState`/`replaceState` or `history.back()` works.

## Edge cases
- `images` changes while the lightbox is open and the current photo is removed. Close, or clamp to a valid index. Never show `undefined`.
- Two photos with the same `alt`: identify them by `id`, not by alt or index alone.
- A photo without a `caption`.
- Rapid `ArrowRight` presses: the counter must never skip or go out of range.
- The Previous/Next buttons have focus when you wrap. Focus must stay on the button that was pressed.
- Opening the lightbox from a thumbnail that's scrolled partway out of view.

## Follow-ups
1. **Preload neighbours.** When a photo is shown, start loading the previous and next full-size images so navigation feels instant. Avoid preloading the whole gallery, and explain how you'd verify it in the Network panel.
2. **Swipe.** On touch devices, swipe left/right to navigate using Pointer Events. Ignore mostly-vertical gestures so the page can still scroll, and follow the finger while dragging.
3. **Deep link.** With `syncUrl`, opening a photo sets `?photo=<id>` (keeping other query params), navigating updates it, and closing removes it. On mount, a valid `?photo=` opens the lightbox on that photo, and an unknown id is ignored. The browser Back button should close the lightbox: which history method do you use for open vs next?
4. **Zoom.** Double-click or `+`/`-` to zoom up to 3×, drag to pan while zoomed, and reset zoom when changing photo. Keep the arrow keys for navigation only when not zoomed.
5. **Thousands of photos.** The gallery has 5,000 photos from an API. What do you virtualise, and how do you keep "focus returns to the thumbnail" working when that thumbnail isn't mounted?

## Concepts covered
The modal dialog pattern · focus trap and focus restoration · refs to a list of elements · modular index arithmetic · keyboard handling scoped to a dialog · live regions · `loading="lazy"` and image preloading · URL state with the History API (follow-up).

Related: S01 Modal Dialog · J12 Image Carousel
