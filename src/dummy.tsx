
import type { TabsProps } from "./types";
import styles from "./Solution.module.css";
import { useId, useRef, useState, type KeyboardEvent } from "react";

export default function Tabs({ tabs, defaultTabId }: TabsProps) {
  // 1. STATE: store only the selected id (a single value — tabs are never "multi").
  //    It may be undefined or point at an id that doesn't exist; we fix that below.
  const [selectedId, setSelectedId] = useState<string | undefined>(
    defaultTabId,
  );

  // 2. UNIQUE IDS per instance, so two <Tabs> on one page never collide.
  const baseId = useId();

  // 3. REFS to every tab button, so the keyboard handler can move focus.
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Hooks must run before any early return (Rules of Hooks), so this check comes after them.
  if (tabs.length === 0) {
    return <div className={styles.root}>No tabs</div>;
  }

  // 4. DERIVE a valid selection instead of trusting state blindly.
  //    Covers: no defaultTabId, an unknown defaultTabId, and the selected tab
  //    being removed when the `tabs` prop changes → fall back to the first tab.
  //    No useEffect needed — it's computed fresh every render.
  const activeTab = tabs.find((t) => t.id === selectedId) ?? tabs[0];

  const tabId = (id: string) => `${baseId}-tab-${id}`;
  const panelId = (id: string) => `${baseId}-panel-${id}`;

  // Select AND focus: this is "automatic activation" (arrow keys select immediately).
  const selectAt = (index: number) => {
    setSelectedId(tabs[index].id);
    tabRefs.current[index]?.focus();
  };

  const handleKeyDown = (
    e: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    const count = tabs.length;
    let target: number;

    switch (e.key) {
      case "ArrowRight":
        target = (index + 1) % count; // last → first
        break;
      case "ArrowLeft":
        target = (index - 1 + count) % count; // first → last
        break;
      case "Home":
        target = 0;
        break;
      case "End":
        target = count - 1;
        break;
      default:
        return; // let Tab, Enter, etc. behave normally
    }

    e.preventDefault(); // Home/End would otherwise scroll the page
    selectAt(target);
  };

  return (
    <div className={styles.root}>
      <div role="tablist" className={styles.tablist}>
        {tabs.map((tab, index) => {
          const isSelected = tab.id === activeTab.id;
          return (
            <button
              key={tab.id}
              ref={(el) => {
                tabRefs.current[index] = el;
              }}
              type="button"
              role="tab"
              id={tabId(tab.id)}
              aria-selected={isSelected}
              aria-controls={panelId(tab.id)}
              // 5. ROVING TABINDEX: only the selected tab is reachable with Tab.
              //    Pressing Tab again skips the other tabs and goes to the panel.
              tabIndex={isSelected ? 0 : -1}
              className={`${styles.tab} ${isSelected ? styles.selected : ""}`}
              onClick={() => setSelectedId(tab.id)}
              onKeyDown={(e) => handleKeyDown(e, index)}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* 6. Only the active panel is rendered, so exactly one tabpanel exists.
          aria-labelledby gives it the tab's label as its accessible name.
          tabIndex=0 makes it reachable even if the content has nothing focusable. */}
      <div
        role="tabpanel"
        id={panelId(activeTab.id)}
        aria-labelledby={tabId(activeTab.id)}
        tabIndex={0}
        className={styles.panel}
      >
        {activeTab.content}
      </div>
    </div>
  );
}
