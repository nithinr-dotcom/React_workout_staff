import { useId, useRef, useState, type KeyboardEvent } from 'react';
import type { TabsProps } from './types';
import styles from './Reference.module.css';

export default function Tabs({ tabs, defaultTabId }: TabsProps) {
  const baseId = useId();
  const [selectedId, setSelectedId] = useState(defaultTabId);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  if (tabs.length === 0) {
    return <p className={styles.empty}>No tabs</p>;
  }

  // Derive a valid selection instead of syncing state: covers unknown defaults and removed tabs.
  const selectedIndex = Math.max(
    0,
    tabs.findIndex((t) => t.id === selectedId),
  );
  const selected = tabs[selectedIndex];

  const tabId = (id: string) => `${baseId}-tab-${id}`;
  const panelId = (id: string) => `${baseId}-panel-${id}`;

  const selectIndex = (index: number) => {
    setSelectedId(tabs[index].id);
    tabRefs.current[index]?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const count = tabs.length;
    const next: Record<string, number> = {
      ArrowRight: (selectedIndex + 1) % count,
      ArrowLeft: (selectedIndex - 1 + count) % count,
      Home: 0,
      End: count - 1,
    };
    if (!(event.key in next)) return;
    event.preventDefault();
    selectIndex(next[event.key]);
  };

  return (
    <div className={styles.tabs}>
      <div role="tablist" className={styles.tablist}>
        {tabs.map((tab, index) => {
          const isSelected = index === selectedIndex;
          return (
            <button
              key={tab.id}
              ref={(el) => {
                tabRefs.current[index] = el;
              }}
              id={tabId(tab.id)}
              type="button"
              role="tab"
              className={styles.tab}
              aria-selected={isSelected}
              aria-controls={panelId(tab.id)}
              tabIndex={isSelected ? 0 : -1}
              onClick={() => setSelectedId(tab.id)}
              onKeyDown={onKeyDown}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      {/* Every panel exists so each tab's aria-controls points at a real element; inactive ones are hidden. */}
      {tabs.map((tab) => (
        <div
          key={tab.id}
          id={panelId(tab.id)}
          role="tabpanel"
          aria-labelledby={tabId(tab.id)}
          tabIndex={0}
          hidden={tab.id !== selected.id}
          className={styles.panel}
        >
          {tab.content}
        </div>
      ))}
    </div>
  );
}
