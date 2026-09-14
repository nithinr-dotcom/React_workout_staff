import type { HolyGrailLayoutProps } from './types';
import styles from './Solution.module.css';

// ⬇ Delete this line when you start. Tests for this task are skipped while it exists.
export const NOT_STARTED = true;

export default function HolyGrailLayout({
  siteTitle,
  navLinks,
  pageTitle,
  children,
  asideTitle,
  aside,
  footer,
  collapsibleNav = false,
}: HolyGrailLayoutProps) {
  // Your implementation here. Requirements are in README.md.
  void siteTitle;
  void navLinks;
  void children;
  void asideTitle;
  void aside;
  void footer;
  void collapsibleNav;
  return <div className={styles.root}>{pageTitle}: start coding in Solution.tsx</div>;
}
