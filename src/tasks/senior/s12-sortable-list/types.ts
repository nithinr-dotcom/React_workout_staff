export interface SortableItem {
  id: string;
  label: string;
}

export interface SortableListProps {
  /** Initial order. The component owns the order after mount. */
  items: SortableItem[];
  /** Called once per committed reorder (pointer drop or keyboard drop) with the full new order. */
  onReorder?: (items: SortableItem[]) => void;
  /** Accessible name of the list. Default "Sortable list". */
  label?: string;
}
