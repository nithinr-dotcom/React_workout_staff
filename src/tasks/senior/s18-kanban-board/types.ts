export interface KanbanCard {
  id: string;
  title: string;
}

export interface KanbanColumn {
  id: string;
  title: string;
  /** Card ids in display order (top to bottom). */
  cardIds: string[];
}

/** Normalized board: columns reference cards by id; cards live in one lookup table. */
export interface BoardState {
  /** Column ids in display order (left to right). */
  columnOrder: string[];
  columns: Record<string, KanbanColumn>;
  cards: Record<string, KanbanCard>;
}

export interface KanbanBoardProps {
  /** Starting board when nothing valid is stored. Default: empty "Todo", "In Progress", "Done" columns. */
  initialBoard?: BoardState;
  /** localStorage key. Default: "kanban-board". */
  storageKey?: string;
}
