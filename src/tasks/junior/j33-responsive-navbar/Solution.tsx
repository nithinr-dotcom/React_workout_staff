import type { NavbarProps } from './types';
import styles from './Solution.module.css';

// ⬇ Delete this line when you start. Tests for this task are skipped while it exists.
export const NOT_STARTED = true;

export default function Navbar({ brand, items, currentHref, onNavigate, isMobile, breakpoint = 768 }: NavbarProps) {
  // Your implementation here. Requirements are in README.md.
  void currentHref;
  void onNavigate;
  void isMobile;
  void breakpoint;
  return (
    <div className={styles.root}>
      {brand} navbar with {items.length} items: start coding in Solution.tsx
    </div>
  );
}
