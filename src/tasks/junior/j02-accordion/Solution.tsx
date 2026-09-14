import type { AccordionProps } from './types';
import styles from './Solution.module.css';

// ⬇ Delete this line when you start. Tests for this task are skipped while it exists.
export const NOT_STARTED = true;

export default function Accordion({ items, allowMultiple = false, defaultOpenIds = [] }: AccordionProps) {
  // Your implementation here. Requirements are in README.md.
  void allowMultiple;
  void defaultOpenIds;
  return <div className={styles.root}>Accordion with {items.length} sections: start coding in Solution.tsx</div>;
}
