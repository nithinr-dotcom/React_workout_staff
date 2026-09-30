import type { TabsProps } from "./types";
import styles from "./Solution.module.css";
import { useId, useRef, useState, type KeyboardEvent } from "react";

export default function Tabs({ tabs, defaultTabId }: TabsProps) {
  // 1. STATE: store only the selected id (a single value — tabs are never "multi").
  //    It may be undefined or point at an id that doesn't exist; we fix that below.
  //    (Your code here was correct.)
  const [selectedId, setSelectedId] = useState<string | undefined>(
    defaultTabId,
  );

  // 2. UNIQUE IDS per instance, so two <Tabs> on one page never collide.
  //    (Your code here was correct.)
  const baseId = useId();

  // 3. REFS to every tab button, so the keyboard handler can move focus.
  //    (Your code here was correct.)
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Hooks must run before any early return (Rules of Hooks), so this check comes after them.
  //
  // MISTAKE 1 — wrong empty-state text.
  // YOUR CODE:
  //   if (tabs.length === 0) return <div>no tabs available</div>;
  // WHY WRONG: the README and the test ask for exactly the text "No tabs".
  if (tabs.length === 0) {
    return <div className={styles.root}>No tabs</div>;
  }

  // 4. DERIVE a valid selection instead of trusting state blindly.
  //    Covers: no defaultTabId, an unknown defaultTabId, and the selected tab
  //    being removed when the `tabs` prop changes → fall back to the first tab.
  //    No useEffect needed — it's computed fresh every render.
  //    (Your code here was correct.)
  const activeTab = tabs.find((t) => t.id === selectedId) ?? tabs[0];

  // MISTAKE 2 — tab and panel got the same id.
  // YOUR CODE:
  //   const tabId = (label: string) => `${baseId}-button-${label}`;
  //   const panelId = (label: string) => `${baseId}-button-${label}`;
  // WHY WRONG: both return the same string, so aria-controls on the button
  // pointed at the button itself. A tab and its panel are two different
  // elements → they need two different ids.
  // Also the parameter was named `label` but you passed item.id. Passing the id
  // is right (labels can be duplicated), so the name should say `id`.
  const tabId = (id: string) => `${baseId}-tab-${id}`;
  const panelId = (id: string) => `${baseId}-panel-${id}`;

  // Select AND focus: this is "automatic activation" (arrow keys select immediately).
  // (Your code here was correct.)
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

    // MISTAKE 3 — Home and End were not handled.
    // YOUR CODE:
    //   switch (e.key) {
    //     case "ArrowRight":
    //       target = (index + 1) % count;
    //       break;
    //     case "ArrowLeft":
    //       target = (index - 1 + count) % count;
    //       break;
    //     default:
    //       return;
    //   }
    // WHY WRONG: the arrow cases were correct, but the README also requires
    // Home → first tab and End → last tab.
    switch (e.key) {
      case "ArrowRight":
        target = (index + 1) % count; // last → first
        break;
      case "ArrowLeft":
        target = (index - 1 + count) % count; // first → last (+count avoids -1)
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

  // MISTAKES 4, 5, 6 are all in the JSX.
  // YOUR CODE (the whole return):
  //   return (
  //     <div>
  //       {tabs.map((item, idx) => {
  //         const isSelected = item.id === activeTab.id;
  //         return (
  //           <button
  //             key={item.id}
  //             id={tabId(item.id)}
  //             role="tab"
  //             ref={(el) => {
  //               tabRefs.current[idx] = el;
  //             }}
  //             aria-selected={isSelected}
  //             aria-controls={panelId(item.id)}
  //             onClick={() => setSelectedId(item.id)}
  //             onKeyDown={(e) => handleKeyDown(e, idx)}
  //           >
  //             {item.label}
  //           </button>
  //         );
  //       })}
  //       <div>{activeTab.content}</div>
  //     </div>
  //   );
  return (
    <div className={styles.root}>
      {/* MISTAKE 4 — no role="tablist" wrapper.
          YOUR CODE: the buttons were direct children of the outer <div>.
          WHY WRONG: role="tab" is only valid inside a tablist. The tablist tells
          a screen reader "these buttons are one group of tabs" ("tab 2 of 3"). */}
      <div role="tablist" className={styles.tablist}>
        {tabs.map((tab, index) => {
          const isSelected = tab.id === activeTab.id;
          return (
            <button
              key={tab.id}
              ref={(el) => {
                tabRefs.current[index] = el;
              }}
              // ADDED: type="button" so a tab never submits a surrounding <form>.
              type="button"
              role="tab"
              id={tabId(tab.id)}
              aria-selected={isSelected}
              aria-controls={panelId(tab.id)}
              // MISTAKE 5 — no roving tabindex.
              // YOUR CODE: the button had no tabIndex prop at all.
              // WHY WRONG: every tab was reachable with the Tab key. Only the
              // selected tab should be (0); the others are -1 (focusable by
              // code/arrow keys, skipped by Tab). So Tab enters the list once,
              // and the next Tab goes to the panel.
              tabIndex={isSelected ? 0 : -1}
              // ADDED: you imported `styles` but never used it, so there was
              // no selected indicator and no focus ring.
              className={`${styles.tab} ${isSelected ? styles.selected : ""}`}
              onClick={() => setSelectedId(tab.id)}
              onKeyDown={(e) => handleKeyDown(e, index)}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* MISTAKE 6 — the panel was a plain div.
          YOUR CODE:
            <div>{activeTab.content}</div>
          WHY WRONG: nothing marked it as a tab panel or linked it to its tab.
          - role="tabpanel"  → identifies it as the content of a tab.
          - id               → must equal the tab's aria-controls (tab → panel link).
          - aria-labelledby  → points back at the tab (panel → tab link), which
                               gives the panel the tab's label as its name.
          - tabIndex={0}     → reachable with Tab even if the content has
                               nothing focusable inside.
          Only the active panel is rendered, so exactly one tabpanel exists. */}
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
