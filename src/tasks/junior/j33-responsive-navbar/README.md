# Responsive Navbar with Hamburger Menu

## Problem statement
Build the top navigation bar for a SaaS marketing site. On wide screens it shows the brand and the links inline. On narrow screens the links collapse behind a hamburger button that opens a slide-in menu. One item, "Products", has a nested submenu that opens and closes like a disclosure. The link for the page being viewed is marked as current.

The breakpoint is a JavaScript concern here, not only a CSS one: the component decides which layout to render. jsdom has no layout, so the decision comes from an `isMobile` prop when it is passed, and from `window.matchMedia` otherwise.

## Clarifying questions to ask
- Is the mobile menu a modal dialog that traps focus? *(No. It is a disclosure: a button that shows and hides a region. No focus trap and no backdrop.)*
- Does the menu close when a link is clicked? *(Yes, and focus goes back to the hamburger button.)*
- How does navigation happen: full page loads or a client router? *(Client router. When `onNavigate` is passed, prevent the default and call it with the `href`.)*
- Should the submenu open on hover on desktop? *(No. Click or keyboard only. Hover menus are a follow-up.)*
- What if the viewport crosses the breakpoint while the menu is open? *(Switch layouts and reset: the mobile menu and the submenu are closed.)*
- Does the current page's parent ("Products") need to look active too? *(Nice to have, not required.)*

## Functional requirements
- [ ] Render a navigation landmark labelled `Main` containing the brand and the items, in order.
- [ ] Items with an `href` render as links. Items with `children` render as a disclosure button that shows or hides a list of child links.
- [ ] The link whose `href` equals `currentHref` has `aria-current="page"`. No other link has `aria-current`. This includes child links inside the submenu.
- [ ] **Desktop layout** (`isMobile === false`, or `matchMedia` says the viewport is at least `breakpoint` px wide): links are inline and there is no hamburger button.
- [ ] **Mobile layout** (`isMobile === true`, or the viewport is narrower than `breakpoint`): render a hamburger button named `Menu`. It starts collapsed. Clicking it toggles the menu containing the items.
- [ ] The hamburger button has `aria-expanded` and `aria-controls` pointing at the element that contains the menu's links.
- [ ] `Escape` pressed while focus is anywhere inside the open mobile menu closes it and moves focus to the `Menu` button.
- [ ] Clicking a link calls `onNavigate(href)` (preventing the default when `onNavigate` is passed). In the mobile layout it also closes the menu and moves focus to the `Menu` button.
- [ ] In the desktop layout, `Escape` inside an open submenu closes the submenu and moves focus to its disclosure button. Clicking a child link closes the submenu.
- [ ] When `isMobile` is undefined, follow `window.matchMedia` and update when the media query's `change` event fires. Remove the listener on unmount.

## Non-functional requirements
- **Accessibility:** use the [WAI-ARIA Disclosure pattern](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/examples/disclosure-navigation/) for both the hamburger and the submenu. Don't use `role="menu"`/`menuitem`: site navigation is a list of links, not an application menu.
  - The landmark is a `<nav>` with an accessible name. Links live in a `<ul>`.
  - Disclosure buttons are real `<button type="button">` elements with `aria-expanded` and `aria-controls`.
  - Closed menus must not be reachable by Tab or a screen reader. A slide-in animation that only moves the menu off-screen is not enough.
- **Keyboard:**

  | Key | Behaviour |
  |---|---|
  | `Enter` / `Space` on a disclosure button | Toggle its menu (native button behaviour) |
  | `Tab` / `Shift+Tab` | Move through visible links and buttons in DOM order. Never trapped. |
  | `Escape` in the open mobile menu | Close the menu, focus `Menu` |
  | `Escape` in an open desktop submenu | Close the submenu, focus `Products` |
- **Styling:** the mobile menu slides in from the side (a `transform` transition) and respects `prefers-reduced-motion`. The hamburger icon is decorative (`aria-hidden`), and the button has a visible focus ring. The current link looks different in a way that doesn't rely only on colour, e.g. an underline.
- **Performance:** subscribe to `matchMedia` once per mount, not on every render.

## Constraints
- 40 minutes. React and CSS Modules only. No router or UI library.
- Keep the public types in `types.ts` unchanged.

## Data / API contract
```ts
interface NavItem {
  label: string;
  href?: string;          // links
  children?: NavItem[];   // disclosure submenu
}
interface NavbarProps {
  brand: string;
  items: NavItem[];
  currentHref: string;
  onNavigate?: (href: string) => void;
  isMobile?: boolean;     // overrides matchMedia when defined
  breakpoint?: number;    // default 768 (desktop at >= breakpoint)
}
```
Default-export the component from `Solution.tsx`. When `isMobile` is undefined, query something like `window.matchMedia('(max-width: 767px)')`, where `matches === true` means mobile.

## Test contract
- The landmark is a `navigation` named `Main`.
- Links are `link`s named by their `label`. The current one has `aria-current="page"`.
- The hamburger is a `button` named `Menu` with `aria-expanded="true|false"` and `aria-controls` equal to the `id` of an element that contains the menu's links while open. In the desktop layout, `queryByRole('button', { name: 'Menu' })` returns `null`.
- The submenu toggle is a `button` named by the item's `label` (e.g. `Products`) with `aria-expanded` and `aria-controls`.
- A **closed** menu's links are unreachable. Either they aren't in the DOM, or an ancestor has the `hidden` attribute, `inert`, or inline `display: none` / `visibility: hidden`. CSS Module classes are not applied in tests, so a class alone won't hide anything.
- In the mobile layout, only the menu's links are rendered. There are no reachable duplicates from a hidden desktop list.
- Tests pass `isMobile` directly, except the `matchMedia` tests. Those stub `window.matchMedia` with an object that has `matches`, `addEventListener`/`removeEventListener` **and** the legacy `addListener`/`removeListener`. They fire `change` by calling the registered listeners with `{ matches }`, after updating the object's `matches`.
- Tests always pass `onNavigate`, so no real navigation happens in jsdom.

## Edge cases
- `currentHref` matches a child link inside the closed submenu. The link still gets `aria-current` when the submenu is opened.
- `currentHref` matches nothing: no `aria-current` anywhere.
- The viewport crosses the breakpoint while the mobile menu is open.
- Two navbars on one page must not share ids. Use `useId`.
- An item with `children` but an empty array.
- Clicking the hamburger twice quickly. It's a toggle, so it must not get stuck open.

## Follow-ups
1. **Click outside.** Close the open mobile menu or desktop submenu on a pointer down outside the navbar, without stealing focus from where the user clicked.
2. **Hover intent.** On desktop, open the submenu on hover after a 150 ms delay and close it 300 ms after the pointer leaves, so a diagonal mouse path doesn't flicker. Keyboard and touch behaviour must not change.
3. **Arrow keys in the submenu.** Add `ArrowDown`/`ArrowUp`/`Home`/`End` navigation between the submenu's links, like the APG disclosure-navigation example, while keeping it a list of links.
4. **Scroll lock and body inert.** The product owner wants the mobile menu to cover the page. Turn it into a modal: lock body scroll, make the rest of the page `inert`, and justify when a nav menu should and shouldn't be modal.
5. **Hide on scroll.** Hide the bar when scrolling down and reveal it when scrolling up, without a scroll listener that sets state on every frame.

## Concepts covered
The disclosure pattern vs `role="menu"` · `aria-current` · `matchMedia` subscriptions (`useSyncExternalStore` or an effect) · focus restoration · Escape handling via event bubbling · hiding content accessibly (`hidden`, `inert`) · testing responsive behaviour without layout.

Related: J02 Accordion · J09 Theme Toggle (matchMedia) · S01 Modal Dialog (focus management)
