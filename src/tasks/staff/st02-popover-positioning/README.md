# Popover / Tooltip positioning primitive

## Problem statement
Every dropdown, menu, date picker and tooltip in your design system needs to float next to an anchor, stay inside the viewport and flip when there's no room. Today each component does its own math, and each one is wrong in a different way.

Build the shared primitive, in three layers:

1. **`computePosition(anchorRect, floatingSize, viewport, options)`**: a **pure function** holding all the geometry. It doesn't touch the DOM, so it's trivially unit-testable.
2. **`usePopover({ open, placement, offset, flip, shift, padding })`**: a thin hook that measures the DOM, calls `computePosition`, and returns refs plus a style object.
3. **`<Tooltip content>`**: an accessible tooltip built on `usePopover`, with hover/focus delays and `Escape` to dismiss.

The interesting staff conversation here is *layering*: what belongs in the pure core, what belongs in the hook, and what belongs in the component.

## Clarifying questions to ask
- Which coordinate space? *(Viewport-relative, the same as `getBoundingClientRect()`. The floating element uses `position: fixed`.)*
- What counts as the viewport in the hook? *(`{ x: 0, y: 0, width: window.innerWidth, height: window.innerHeight }`. Clipping ancestors are a follow-up.)*
- What happens when both sides overflow? *(Keep the preferred side, then let shift handle the cross axis.)*
- Does shift also move the element along the main axis? *(No, only the cross axis.)*
- Must the popover follow the anchor on scroll and resize? *(Yes in the hook: re-position on `scroll` (capture) and `resize` while open. Not tested.)*
- Should the tooltip be portalled? *(Your choice. Justify it in the design notes. Tests query the whole document.)*

## Functional requirements
### `computePosition`
- [ ] **Main axis.** For `bottom*` the floating element's top edge sits `offset` px below the anchor's bottom edge. For `top*` its bottom edge sits `offset` px above the anchor's top edge. `left*` and `right*` work the same way horizontally.
- [ ] **Cross-axis alignment.** With no suffix, the floating element is centred on the anchor. `-start` aligns their start edges (left for top/bottom, top for left/right). `-end` aligns their end edges.
- [ ] **Flip** (default on). Overflow is checked against the viewport shrunk by `padding` on every side. If the preferred side overflows on the main axis **and** the opposite side doesn't, use the opposite side and keep the alignment. Otherwise keep the preferred side.
- [ ] **Shift** (default on). After flipping, clamp the cross-axis coordinate so the floating element stays within the padded viewport. If it's larger than the padded viewport, align it to the start edge (left or top) of the padded viewport.
- [ ] Return `{ x, y, placement }`, where `placement` is the one actually used.

### `usePopover`
- [ ] Returns `anchorRef` and `floatingRef` (ref callbacks), `style`, `placement` and `update`.
- [ ] While `open`, measures both elements with `getBoundingClientRect()`, computes the position against `window.innerWidth` × `window.innerHeight`, and exposes `style` with `position: 'fixed'`, `top` and `left` in px.
- [ ] Re-positions on window `resize` and `scroll` (capture phase) while open, and removes those listeners when closed or unmounted.

### `Tooltip`
- [ ] Wraps a single child element. It must not add a wrapper element around the child, so the child stays in place in the layout and focus order.
- [ ] Hovering the child shows the tooltip after `openDelay` ms (default 300). Leaving hides it after `closeDelay` ms (default 0). Leaving before `openDelay` has elapsed cancels the pending show.
- [ ] Focusing the child shows the tooltip after `openDelay`. Blurring hides it.
- [ ] `Escape` hides a visible tooltip, even while the pointer is still over the child.
- [ ] While visible, the tooltip has `role="tooltip"` and the child references it with `aria-describedby`. Keep any `aria-describedby` the child already had.
- [ ] Handlers and refs already on the child keep working. Compose them, don't override them.

## Non-functional requirements
- **Accessibility:** [APG tooltip pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tooltip/). A tooltip never contains interactive content, and never receives focus.
- **Keyboard:**

  | Key | Behaviour |
  |---|---|
  | `Tab` onto the trigger | Show after `openDelay` |
  | `Tab` away | Hide |
  | `Escape` | Hide the tooltip. Focus stays on the trigger |

- **Performance:** no layout thrash. Read rects in one batch, then write style once. Scroll and resize handling must not cause more than one measurement per frame. There must be no visible frame at `(0, 0)` before the first measurement: position before paint, or hide until measured.
- **Motion:** respect `prefers-reduced-motion` if you animate.
- **Layering:** explain in DESIGN.md how the popover wins against `z-index` and `overflow: hidden` ancestors.

## Constraints
- 100 minutes. React only. No Floating UI or Popper.
- `types.ts` is the minimal contract. You may add options (arrow, `autoUpdate`, `boundary`) but don't break it.
- Export `computePosition`, `usePopover` and `Tooltip` as named exports from `Solution.tsx`.

## Data / API contract
```ts
type Side = 'top' | 'bottom' | 'left' | 'right';
type Placement = Side | `${Side}-start` | `${Side}-end`;
interface Rect { x: number; y: number; width: number; height: number }
interface Size { width: number; height: number }
interface PositionOptions {
  placement?: Placement;   // default 'bottom'
  offset?: number;         // default 0
  flip?: boolean;          // default true
  shift?: boolean;         // default true
  padding?: number;        // default 0
}
interface PositionResult { x: number; y: number; placement: Placement }

function computePosition(anchor: Rect, floating: Size, viewport: Rect, options?: PositionOptions): PositionResult;

interface UsePopoverOptions extends PositionOptions { open: boolean }
interface UsePopoverResult {
  anchorRef: RefCallback<HTMLElement>;
  floatingRef: RefCallback<HTMLElement>;
  style: CSSProperties;    // ⊇ { position: 'fixed', top, left }
  placement: Placement;
  update: () => void;
}
function usePopover(options: UsePopoverOptions): UsePopoverResult;

interface TooltipProps {
  content: ReactNode;
  children: ReactElement;
  placement?: Placement;
  openDelay?: number;      // default 300
  closeDelay?: number;     // default 0
}
```

## Test contract
- `computePosition` is tested directly with plain numbers and a `{ x: 0, y: 0, width: 1000, height: 800 }` viewport. Exact `x` / `y` values are compared.
- `usePopover` is tested by mocking `HTMLElement.prototype.getBoundingClientRect`. jsdom's window is 1024 × 768. The test reads the floating element's inline `style.top` / `style.left`, for example `'128px'`, inside `waitFor`.
- Tooltip tests use fake timers (`shouldAdvanceTime: true`) and a `<button>` child. The tooltip is found with `getByRole('tooltip')`. The link is checked with `toHaveAccessibleDescription(<content>)`.
- When hidden, `queryByRole('tooltip')` returns `null`: unmount it, or use `hidden` / `display: none`.

## Edge cases
- The anchor is scrolled out of view: keep positioning, or hide? *(Your call. Document it.)*
- The floating element's size changes after it opens, for example when content loads. How does the position update?
- Zero-size anchor (a caret position, or a `display: contents` element).
- The tooltip child already has `onMouseEnter`, `onFocus`, `aria-describedby`, or a `ref`.
- The tooltip child is disabled. Disabled buttons don't fire mouse events in some browsers.
- Two tooltips: moving quickly from one trigger to the next should ideally skip the second delay ("warm-up" or group delay).
- RTL layouts: does `start` mean left?

## Follow-ups
1. **Arrow.** Return the arrow's offset so it still points at the anchor centre after shifting, clamped so it never leaves the floating element's rounded corners.
2. **Clipping ancestors.** Compute the boundary as the intersection of every scrollable ancestor's rect with the viewport instead of just the viewport. What's the cost per frame?
3. **`autoPlacement`.** Pick the side with the most available space instead of a fixed preferred side. How do you stop it jittering during scroll?
4. **Top layer.** Re-implement with the native `popover` attribute and CSS anchor positioning. What does it replace, and what can't it do yet?
5. **Group delay.** A `TooltipProvider` that skips `openDelay` when another tooltip closed within the last 300 ms.

## Concepts covered
Pure core with a thin React adapter · `getBoundingClientRect` and `position: fixed` · `useLayoutEffect` vs `useEffect` for measure-before-paint · ref callbacks and composing refs · `cloneElement` and handler composition · timers with cleanup · stacking contexts and portals · the APG tooltip pattern.

Related: ST01 Select · J02 Accordion.

## Design discussion prompts
- Why is `computePosition` pure? What does that buy you in tests, SSR and reuse across frameworks?
- `useLayoutEffect` or `useEffect` for measuring, and what happens during SSR? How do you avoid the flash at `(0, 0)`?
- Portal vs inline rendering: what breaks with each? Consider focus order, event bubbling through portals, CSS inheritance, `overflow: hidden` and `transform` containing blocks.
- How would you define a z-index scale for the whole design system? Who owns it, and how do nested layers (a tooltip inside a modal inside a drawer) work?
- `transform: translate()` vs `top/left` for positioning. What are the performance and sub-pixel tradeoffs?
- How would you keep the popover attached during scroll inside nested scroll containers without re-measuring 60 times a second for every open popover?
- `cloneElement` has sharp edges. How else could `Tooltip` attach to its trigger? Consider a render prop, a `useTooltip` hook returning props, or `asChild`.
- What would your deprecation path be when the platform's CSS anchor positioning is widely available?
