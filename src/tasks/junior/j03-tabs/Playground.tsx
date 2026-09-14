import type { ComponentType } from 'react';
import type { TabItem, TabsProps } from './types';

const TABS: TabItem[] = [
  { id: 'overview', label: 'Overview', content: 'Tabs organise related content into panels shown one at a time.' },
  { id: 'keyboard', label: 'Keyboard', content: 'Only the selected tab is in the Tab order. Arrow keys move between tabs.' },
  { id: 'aria', label: 'ARIA', content: 'tablist, tab and tabpanel roles, wired together with aria-controls and aria-labelledby.' },
  { id: 'followups', label: 'Follow-ups', content: 'Manual activation, controlled mode, lazy panels, vertical orientation.' },
];

export default function Playground({ impl }: { impl: { default: ComponentType<TabsProps> } }) {
  const Tabs = impl.default;
  return (
    <div style={{ display: 'grid', gap: 24, maxWidth: 640 }}>
      <section>
        <h3>Default</h3>
        <button type="button">Focusable before the tabs</button>
        <Tabs tabs={TABS} />
      </section>
      <section>
        <h3>defaultTabId=&quot;aria&quot;</h3>
        <Tabs tabs={TABS} defaultTabId="aria" />
      </section>
      <section>
        <h3>Empty</h3>
        <Tabs tabs={[]} />
      </section>
    </div>
  );
}
