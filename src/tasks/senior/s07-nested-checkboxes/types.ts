export interface CheckboxNode {
  id: string;
  label: string;
  /** A node without children (or with an empty array) is a leaf. */
  children?: CheckboxNode[];
}

export interface NestedCheckboxesProps {
  nodes: CheckboxNode[];
  /** Leaf ids selected initially. Parent ids in this list are ignored. */
  defaultSelectedIds?: string[];
  /** Called after every user change with the selected leaf ids, in tree (depth-first) order. */
  onChange?: (selectedLeafIds: string[]) => void;
}
