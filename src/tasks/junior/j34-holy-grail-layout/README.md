# Holy Grail Layout

## Problem statement
Build the classic "holy grail" page shell as a reusable `HolyGrailLayout` component:

```
┌──────────────────────────────────────────┐
│                  header                  │
├──────────┬────────────────────┬──────────┤
│   nav    │        main        │  aside   │
│  (left)  │  (fluid, widest)   │ (right)  │
├──────────┴────────────────────┴──────────┤
│                  footer                  │
└──────────────────────────────────────────┘
```

The side columns have fixed widths and the main column takes the rest. The three columns are equally tall however much content each one has. On a short page the footer sits at the bottom of the viewport, not right under the content. On narrow screens the columns stack into one column in the order **main → nav → aside**.

This is mostly a CSS task. The markup is small, but it has to be the right markup. Landmarks, heading order, source order and a skip link are what a screen reader or keyboard user actually uses, and they're what the tests check. The visual result can't be tested in jsdom, so you check it yourself in the Playground against the checklist below.

## Clarifying questions to ask
- Grid or flexbox? *(Your choice. Be ready to explain why. Building the other version is follow-up 1.)*
- What order should the DOM be in? *(`header`, `main`, `nav`, `aside`, `footer`. The stacked mobile order is then the natural source order. On desktop, CSS places nav visually on the left, **without** the `order` property, `flex-direction: row-reverse` or anything else that makes visual order differ from reading order within a column. Think about which layout tool makes that easy.)*
- Isn't it odd that on desktop, keyboard focus reaches main before the left nav? *(Yes. It's the accepted trade-off of content-first source order. Discuss it.)*
- Where is the breakpoint? *(Stack below 720px.)*
- Should the layout fill the viewport? *(Yes. The root is at least the viewport's height (`100dvh`), and the footer is pushed down on short pages.)*
- Do the side columns scroll independently? *(No, the whole page scrolls.)*

## Functional requirements
- [ ] Render a header, a main column, a left navigation column, an optional right column and a footer, in that DOM order.
- [ ] The header shows `siteTitle`. It is not a heading level 1.
- [ ] The main column starts with `pageTitle` as the page's only `h1`, followed by `children`.
- [ ] The navigation is labelled `Primary` and renders `navLinks` as a list of links.
- [ ] When `aside` is passed, render it in a complementary landmark that has `asideTitle` as its `h2` and is named by that heading. When `aside` is undefined, render no complementary landmark and let main take the extra width.
- [ ] The footer renders `footer`.
- [ ] The first focusable element on the page is a skip link, `Skip to main content`, pointing at the main element's `id`. It is visually hidden until focused. The main element has `tabindex="-1"` so browsers can move focus to it.
- [ ] **Visual (self-checked):** the Playground checklist below passes at both desktop and mobile widths.

### Visual checklist (Playground)
- [ ] Desktop (≥ 720px): nav on the left (about 200px), main in the middle (fluid), aside on the right (about 240px). Header and footer span the full width.
- [ ] The three columns are the same height when main is much longer than the side columns, and when it is much shorter.
- [ ] With "Short page" selected, the footer touches the bottom of the preview/viewport, and there is no gap under it.
- [ ] With "Long page" selected, the footer comes after the content, and the page scrolls normally. It is **not** `position: fixed`.
- [ ] Mobile (< 720px, use the devtools device toolbar): one column, in the visual order header → main → nav → aside → footer.
- [ ] With no aside, main takes the extra width, and there is no empty right gutter.
- [ ] Long unbroken words or URLs in main don't overflow the column (`min-width: 0` / `overflow-wrap`).
- [ ] Tab once: the skip link appears. Press Enter: the next Tab lands inside main.
- [ ] Zoom to 200%: nothing overlaps or is cut off.

## Non-functional requirements
- **Accessibility:**
  - Use native landmark elements (`header`, `nav`, `main`, `aside`, `footer`) and don't nest `header`/`footer` inside `main`, `section`, `article`, `aside` or `nav`. Plain wrapper `div`s are fine. That way `header`/`footer` map to `banner`/`contentinfo`.
  - One `h1` per page. Headings don't skip levels.
  - Visual order matches DOM order within each layout mode ([WCAG 1.3.2](https://www.w3.org/WAI/WCAG22/Understanding/meaningful-sequence), [2.4.3](https://www.w3.org/WAI/WCAG22/Understanding/focus-order)).
  - The skip link becomes visible on focus. `display: none` would make it unfocusable.
- **Keyboard:**

  | Key | Behaviour |
  |---|---|
  | `Tab` (first press) | Focus the skip link, which becomes visible |
  | `Enter` on the skip link | Move to main. The next `Tab` continues inside main. |
- **Styling:** use CSS only for layout: no JS measurements or resize listeners. No fixed heights on the columns. Use logical properties where you can (`padding-inline`, `inset-inline-start`).

## Constraints
- 35 minutes. React and CSS Modules only. No CSS framework.
- Keep the public types in `types.ts` unchanged.

## Data / API contract
```ts
interface LayoutLink { label: string; href: string }
interface HolyGrailLayoutProps {
  siteTitle: string;
  navLinks: LayoutLink[];
  pageTitle: string;          // the only h1, inside main
  children: ReactNode;        // main content
  asideTitle?: string;        // h2 + name of the complementary landmark
  aside?: ReactNode;          // omit → no right column
  footer: ReactNode;
  collapsibleNav?: boolean;   // follow-up 2
}
```
Default-export the component from `Solution.tsx`.

## Test contract
- Exactly one each of `banner`, `main` and `contentinfo`. One `navigation` named `Primary` that contains a `link` for every `navLinks` entry.
- The `complementary` landmark is named `asideTitle` and contains an `h2` with that text and the `aside` content. When `aside` is undefined, `queryByRole('complementary')` is `null`.
- Exactly one `heading` with `level: 1`. Its text is `pageTitle`, and it is inside `main`. `siteTitle` text is inside `banner`.
- `children` text is inside `main`, and `footer` text is inside `contentinfo`.
- DOM order (`compareDocumentPosition`) is banner → main → navigation → complementary → contentinfo.
- The first `user.tab()` focuses a `link` named `Skip to main content`. Its `href` attribute is `#` followed by the `main` element's `id`, and `main` has `tabindex="-1"`.
- Visual layout isn't tested. Use the checklist.

## Edge cases
- `navLinks` is empty. Keep the nav landmark so the grid areas stay stable, or remove the column cleanly. Either way, no broken layout.
- `aside` is undefined, but `asideTitle` is passed.
- Main content is a very wide table or a long URL. The fluid column must shrink instead of pushing the aside off-screen (the `min-width: auto` trap for grid and flex items).
- Two layouts on one page (e.g. in the Playground) must not share the main `id`. Use `useId`.
- The browser's mobile toolbar changes the viewport height: `100vh` vs `100dvh`.

## Follow-ups
1. **Grid vs flex.** Build the other version. With flexbox you'll need a wrapper for the three columns. Compare them: which one lets you change the mobile order without touching the DOM? What does each one do to equal-height columns and the sticky footer?
2. **Collapsible sidebar.** With `collapsibleNav`, render a button named `Toggle navigation` with `aria-expanded` and `aria-controls` pointing at the nav (or an element wrapping it). It starts expanded. Collapsing hides the nav (and its links from Tab and screen readers), and main grows into the space. Animate the width without animating `grid-template-columns` in JS.
3. **Sticky header with a scroll shadow.** Make the header `position: sticky` and show a shadow only once the page has scrolled. Do it without a scroll listener that sets state on every scroll event: use an `IntersectionObserver` on a sentinel, or CSS scroll-driven animations.
4. **Gallery inside main (Flipkart UI round).** Inside the main column, lay out product images **3 per row with flexbox**, not grid. The images have different sizes and aspect ratios. Keep the rows aligned, don't let tall images stretch the row, and make the last row left-aligned when it has 1 or 2 items. Then explain how you'd get 2 per row on tablets and 1 on phones.
5. **Container queries.** The same layout is embedded in a 600px-wide panel on a desktop screen. Stack based on the container's width instead of the viewport's.

## Concepts covered
Landmark roles and the `banner`/`contentinfo` scoping rules · heading outline · skip links · `grid-template-areas` · flex sizing and the `min-width: auto` trap · sticky footer · source order vs visual order (WCAG 1.3.2, 2.4.3) · media vs container queries.

Related: J33 Responsive Navbar · J09 Theme Toggle
