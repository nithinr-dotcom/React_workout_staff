export interface NavItem {
  label: string;
  /** Destination. Required for links; ignored for items that have `children`. */
  href?: string;
  /** When present, the item is a disclosure button that shows these links as a submenu. */
  children?: NavItem[];
}

export interface NavbarProps {
  /** Brand text shown at the start of the bar. */
  brand: string;
  items: NavItem[];
  /** The `href` of the page being viewed. That link gets `aria-current="page"`. */
  currentHref: string;
  /** Called with the link's `href` when a link is clicked (SPA-style navigation). */
  onNavigate?: (href: string) => void;
  /**
   * Forces the layout. `true` = hamburger layout, `false` = inline links.
   * When undefined, the component follows `window.matchMedia` using `breakpoint`.
   */
  isMobile?: boolean;
  /** Width in px at and above which the desktop layout is used. Default 768. */
  breakpoint?: number;
}
