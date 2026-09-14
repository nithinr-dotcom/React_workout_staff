export interface TabItem {
  id: string;
  label: string;
  content: string;
}

export interface TabsProps {
  tabs: TabItem[];
  /** Tab selected on first render. Falls back to the first tab when missing or unknown. */
  defaultTabId?: string;
}
