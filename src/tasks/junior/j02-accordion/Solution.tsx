import type { AccordionProps } from "./types";
import styles from "./Solution.module.css";
import { useId, useRef, useState, type KeyboardEvent } from "react";

export default function Accordion({
  items,
  allowMultiple = false,
  defaultOpenIds = [],
}: AccordionProps) {
  // 1. STATE: a Set of open item ids.
  //    Lazy initializer (a function) so this only runs on the first render.
  //    In single mode only the first default id counts.
  const [openIds, setOpenIds] = useState<Set<string>>(
    () => new Set(allowMultiple ? defaultOpenIds : defaultOpenIds.slice(0, 1)),
  );

  // 2. UNIQUE IDS: useId gives a prefix that differs per Accordion instance,
  //    so two accordions on one page never share DOM ids.
  const baseId = useId();

  // 3. REFS: one ref slot per header button, used for arrow-key focus moves.
  const headerRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const toggle = (id: string) => {
    setOpenIds((prev) => {
      const isOpen = prev.has(id);
      if (allowMultiple) {
        // Never mutate state — copy the Set, then add/remove.
        const next = new Set(prev);
        if (isOpen) next.delete(id);
        else next.add(id);
        return next;
      }
      // Single mode: clicking the open one closes all; otherwise only this one is open.
      // Note: new Set([id]) — NOT new Set(id), which would split the string into chars.
      return isOpen ? new Set() : new Set([id]);
    });
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const count = items.length;
    let target: number | null = null;

    switch (e.key) {
      case "ArrowDown":
        target = (index + 1) % count; // wraps last → first
        break;
      case "ArrowUp":
        target = (index - 1 + count) % count; // wraps first → last
        break;
      case "Home":
        target = 0;
        break;
      case "End":
        target = count - 1;
        break;
      default:
        return; // Enter / Space are handled natively by <button> (fires onClick)
    }

    e.preventDefault(); // stop the page from scrolling
    headerRefs.current[target]?.focus();
  };

  if (items.length === 0) {
    return <div className={styles.root}>No sections</div>;
  }

  return (
    <div className={styles.root}>
      {items.map((item, index) => {
        const isOpen = openIds.has(item.id);
        // Ids come from item.id (never the title — titles can be duplicated).
        const buttonId = `${baseId}-button-${item.id}`;
        const panelId = `${baseId}-panel-${item.id}`;

        return (
          <div key={item.id} className={styles.item}>
            {/* ARIA pattern: a <button> inside a heading */}
            <h3 className={styles.heading}>
              <button
                ref={(el) => {
                  headerRefs.current[index] = el;
                }}
                id={buttonId}
                type="button"
                className={styles.trigger}
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => toggle(item.id)}
                onKeyDown={(e) => handleKeyDown(e, index)}
              >
                <span>{item.title}</span>
                <span
                  className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ""}`}
                  aria-hidden="true"
                >
                  ▾
                </span>
              </button>
            </h3>

            {/* Panel is always in the DOM (so aria-controls points at something),
                but hidden when closed. role="region" + aria-labelledby gives it
                the button's title as its accessible name. */}
            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              hidden={!isOpen}
              className={styles.panel}
            >
              {item.content}
            </div>
          </div>
        );
      })}
    </div>
  );
}
