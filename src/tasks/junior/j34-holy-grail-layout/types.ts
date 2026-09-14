import type { ReactNode } from 'react';

export interface LayoutLink {
  label: string;
  href: string;
}

export interface HolyGrailLayoutProps {
  /** Site name shown in the header. Not the page's h1. */
  siteTitle: string;
  /** Links for the left navigation column. */
  navLinks: LayoutLink[];
  /** The page's single h1, rendered at the top of the main column. */
  pageTitle: string;
  /** Main column content. */
  children: ReactNode;
  /** Heading (h2) of the right column. Also the complementary landmark's accessible name. */
  asideTitle?: string;
  /** Right column content. When undefined, no right column or complementary landmark is rendered. */
  aside?: ReactNode;
  /** Footer content. */
  footer: ReactNode;
  /** Follow-up 2: render a button that collapses the left navigation. */
  collapsibleNav?: boolean;
}
