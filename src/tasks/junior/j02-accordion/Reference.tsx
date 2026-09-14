import { useId, useRef, useState, type KeyboardEvent } from 'react';
import type { AccordionProps } from './types';
import styles from './Reference.module.css';

export default function Accordion({ items, allowMultiple = false, defaultOpenIds = [] }: AccordionProps) {
  const baseId = useId();
  // A Set makes toggling O(1) and reads well for both modes.
  const [openIds, setOpenIds] = useState<Set<string>>(
    () => new Set(allowMultiple ? defaultOpenIds : defaultOpenIds.slice(0, 1)),
  );
  const headerRefs = useRef<(HTMLButtonElement | null)[]>([]);

  if (items.length === 0) {
    return <p className={styles.empty}>No sections</p>;
  }

  const toggle = (id: string) => {
    setOpenIds((prev) => {
      const next = new Set(allowMultiple ? prev : []);
      if (prev.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = items.length - 1;
    const target =
      event.key === 'ArrowDown'
        ? (index + 1) % items.length
        : event.key === 'ArrowUp'
          ? (index - 1 + items.length) % items.length
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? last
              : null;
    if (target === null) return;
    event.preventDefault();
    headerRefs.current[target]?.focus();
  };

  return (
    <div className={styles.accordion}>
      {items.map((item, index) => {
        const open = openIds.has(item.id);
        const buttonId = `${baseId}-button-${item.id}`;
        const panelId = `${baseId}-panel-${item.id}`;
        return (
          <div key={item.id} className={styles.item}>
            <h3 className={styles.heading}>
              <button
                ref={(el) => {
                  headerRefs.current[index] = el;
                }}
                id={buttonId}
                type="button"
                className={styles.trigger}
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => toggle(item.id)}
                onKeyDown={(e) => onKeyDown(e, index)}
              >
                <span>{item.title}</span>
                <span className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`} aria-hidden="true">
                  ▾
                </span>
              </button>
            </h3>
            <div id={panelId} role="region" aria-labelledby={buttonId} className={styles.panel} hidden={!open}>
              {item.content}
            </div>
          </div>
        );
      })}
    </div>
  );
}
