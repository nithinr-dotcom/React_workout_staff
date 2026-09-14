# Image Carousel

## Problem statement
Build the hero carousel from an e-commerce home page. It shows one image at a time. Previous and Next buttons wrap around at the ends, a row of dots jumps straight to a slide, and it can advance on its own. Autoplay must stop while the user is looking at or interacting with the carousel: when the pointer is over it or keyboard focus is inside it. Otherwise the slide changes under their cursor.

## Clarifying questions to ask
- Does navigation wrap around? *(Yes, in both directions.)*
- Is autoplay on by default? *(No. It's on only when `autoPlayInterval` is a positive number of milliseconds.)*
- When autoplay resumes after a hover, does it wait a full interval? *(Yes, a full interval from when the pause ended.)*
- Do we need slide animations? *(Nice to have. It's follow-up 2.)*
- Should all images load up front? *(Fine for now. Lazy-loading is a follow-up.)*

## Functional requirements
- [ ] Show the first image initially, along with the text `Slide 1 of N`.
- [ ] `Next slide` shows the next image; after the last image it wraps to the first.
- [ ] `Previous slide` shows the previous image; before the first image it wraps to the last.
- [ ] Render one dot button per image. Clicking a dot shows that slide. The active dot is marked.
- [ ] `ArrowRight` / `ArrowLeft` go to the next / previous slide while keyboard focus is anywhere inside the carousel.
- [ ] With `autoPlayInterval > 0`, advance to the next slide (wrapping) every `autoPlayInterval` ms.
- [ ] Autoplay pauses while the pointer is over the carousel and while focus is inside it, and resumes when both end.
- [ ] Manual navigation restarts the autoplay countdown.
- [ ] Clear timers when the component unmounts or when `autoPlayInterval` changes.
- [ ] An empty `images` array renders the text `No images`. A single image disables (or hides) Previous/Next and doesn't autoplay.

## Non-functional requirements
- **Accessibility:** follow the [WAI-ARIA Carousel pattern](https://www.w3.org/WAI/ARIA/apg/patterns/carousel/).
  - The root is a `<section>` (region) with `aria-roledescription="carousel"` and `aria-label={label}`.
  - Every image has meaningful `alt` text.
  - Slides that aren't current aren't exposed: either don't render them, or mark them with `hidden` / `aria-hidden="true"`.
  - Dots are buttons named `Go to slide N`; the active dot has `aria-current="true"`.
  - A live region announces `Slide N of M`: `aria-live="polite"` when autoplay is off or paused, `aria-live="off"` while it's rotating, so screen readers aren't spammed.
- **Keyboard:**

  | Key | Behaviour |
  |---|---|
  | `Tab` | Move through Previous, Next and the dots; focus inside pauses autoplay |
  | `Enter` / `Space` | Activate the focused button |
  | `ArrowRight` | Next slide (wraps) |
  | `ArrowLeft` | Previous slide (wraps) |
- **Performance:** give images fixed dimensions (`aspect-ratio`) so the layout doesn't jump when slides change.
- **Motion:** don't autoplay for users with `prefers-reduced-motion: reduce`. *(Not tested, but mention it.)*

## Constraints
- 45 minutes. React and CSS Modules only. No carousel libraries.
- Keep the public types in `types.ts` unchanged, because the tests and Playground depend on them.

## Data / API contract
```ts
interface CarouselImage { src: string; alt: string }

interface ImageCarouselProps {
  images: CarouselImage[];
  autoPlayInterval?: number; // ms; 0/undefined = no autoplay
  label?: string;            // default "Image carousel"
}
```
Default-export the component from `Solution.tsx`.

## Test contract
- A `region` named by `label` (default `Image carousel`) with `aria-roledescription="carousel"`.
- The current slide is an `img` whose accessible name is its `alt`. Other slides are not found by `queryByRole('img', { name: alt })`: they're not rendered, or they're `hidden` / `aria-hidden`. Tests don't apply your CSS, so `display: none` from a stylesheet doesn't count.
- The text `Slide N of M` is visible.
- `button`s named `Previous slide`, `Next slide` and `Go to slide N`; the active dot has `aria-current="true"`.
- Arrow keys are sent with `user.keyboard` while a button inside the carousel has focus.
- Autoplay tests use `vi.useFakeTimers({ shouldAdvanceTime: true })` and `act(() => vi.advanceTimersByTime(ms))`. Hover is `user.hover(currentImage)` / `user.unhover(currentImage)`. Focus is simulated by calling `.focus()` / `.blur()` on a button inside the carousel.
- An empty list renders the text `No images`.

## Edge cases
- `images` shrinking so the current index is out of range.
- Hover and focus both active: leaving one must not resume autoplay while the other is still active.
- `autoPlayInterval` changing while playing.
- Two images with the same `src`. Don't use `src` as the only key.

## Follow-ups
1. **Pause/Play button.** WCAG 2.2.2 requires a way to stop auto-moving content. Add a `Pause` / `Play` toggle as the first focusable control. Once the user presses Pause, hover and focus must not restart autoplay.
2. **Slide transition.** Animate slides horizontally with `transform: translateX(-index * 100%)` on a track. Make wrap-around from the last slide to the first look continuous, not a rewind across every slide.
3. **Swipe.** Support touch and pointer swiping with Pointer Events: a drag past a threshold changes slide, a smaller drag snaps back, and vertical scrolling still works.
4. **Lazy images.** Load only the current and neighbouring images. Discuss `loading="lazy"`, `decoding="async"` and preloading the next image.

## Concepts covered
Modular index arithmetic · `setInterval` / `setTimeout` lifecycles and cleanup · deriving "is paused" from several independent reasons · focus-within detection · the ARIA carousel pattern and polite live regions.

Related: J03 Tabs · J06 Traffic Light (timer chains) · J10 Progress Bar.
