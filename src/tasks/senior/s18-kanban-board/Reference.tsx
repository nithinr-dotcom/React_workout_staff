import {
  useEffect,
  useId,
  useReducer,
  useRef,
  useState,
  type Dispatch,
  type DragEvent,
  type FormEvent,
  type KeyboardEvent,
  type RefObject,
} from 'react';
import type { BoardState, KanbanBoardProps, KanbanCard, KanbanColumn } from './types';
import styles from './Reference.module.css';

/* ---------- state ---------- */

type Action =
  | { type: 'add'; columnId: string; card: KanbanCard }
  | { type: 'rename'; cardId: string; title: string }
  | { type: 'delete'; cardId: string }
  /** `toIndex` is the index in the target column *after* the card has been removed from its source. */
  | { type: 'move'; cardId: string; toColumnId: string; toIndex?: number }
  | { type: 'replace'; board: BoardState };

function defaultBoard(): BoardState {
  const columns: KanbanColumn[] = [
    { id: 'todo', title: 'Todo', cardIds: [] },
    { id: 'in-progress', title: 'In Progress', cardIds: [] },
    { id: 'done', title: 'Done', cardIds: [] },
  ];
  return {
    columnOrder: columns.map((c) => c.id),
    columns: Object.fromEntries(columns.map((c) => [c.id, c])),
    cards: {},
  };
}

function findColumnId(board: BoardState, cardId: string): string | undefined {
  return board.columnOrder.find((id) => board.columns[id].cardIds.includes(cardId));
}

function reducer(board: BoardState, action: Action): BoardState {
  switch (action.type) {
    case 'add': {
      const column = board.columns[action.columnId];
      if (!column) return board;
      return {
        ...board,
        cards: { ...board.cards, [action.card.id]: action.card },
        columns: { ...board.columns, [column.id]: { ...column, cardIds: [...column.cardIds, action.card.id] } },
      };
    }
    case 'rename': {
      const card = board.cards[action.cardId];
      if (!card || card.title === action.title) return board;
      return { ...board, cards: { ...board.cards, [card.id]: { ...card, title: action.title } } };
    }
    case 'delete': {
      const columnId = findColumnId(board, action.cardId);
      if (!columnId) return board;
      const column = board.columns[columnId];
      const cards = { ...board.cards };
      delete cards[action.cardId];
      return {
        ...board,
        cards,
        columns: { ...board.columns, [columnId]: { ...column, cardIds: column.cardIds.filter((id) => id !== action.cardId) } },
      };
    }
    case 'move': {
      const fromId = findColumnId(board, action.cardId);
      const target = board.columns[action.toColumnId];
      if (!fromId || !target) return board;
      const from = board.columns[fromId];
      const fromIndex = from.cardIds.indexOf(action.cardId);
      const remaining = (fromId === target.id ? from.cardIds : target.cardIds).filter((id) => id !== action.cardId);
      const toIndex = Math.max(0, Math.min(action.toIndex ?? remaining.length, remaining.length));
      if (fromId === target.id && fromIndex === toIndex) return board;
      const nextTarget = [...remaining.slice(0, toIndex), action.cardId, ...remaining.slice(toIndex)];
      const columns = { ...board.columns, [target.id]: { ...target, cardIds: nextTarget } };
      if (fromId !== target.id) {
        columns[fromId] = { ...from, cardIds: from.cardIds.filter((id) => id !== action.cardId) };
      }
      return { ...board, columns };
    }
    case 'replace':
      return action.board;
  }
}

/* ---------- persistence ---------- */

function isBoard(value: unknown): value is BoardState {
  if (!value || typeof value !== 'object') return false;
  const b = value as BoardState;
  if (!Array.isArray(b.columnOrder) || !b.columns || typeof b.columns !== 'object' || !b.cards || typeof b.cards !== 'object') {
    return false;
  }
  return b.columnOrder.every((id) => {
    const col = b.columns[id];
    return (
      col &&
      typeof col.title === 'string' &&
      Array.isArray(col.cardIds) &&
      col.cardIds.every((cardId) => typeof b.cards[cardId]?.title === 'string')
    );
  });
}

function readStored(key: string): BoardState | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isBoard(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

let idCounter = 0;
function newCardId() {
  idCounter += 1;
  return `card-${Date.now().toString(36)}-${idCounter}`;
}

/* ---------- components ---------- */

interface FocusRequest {
  cardId: string;
  control: 'move' | 'up' | 'down' | 'edit';
}

export default function KanbanBoard({ initialBoard, storageKey = 'kanban-board' }: KanbanBoardProps) {
  const [board, dispatch] = useReducer(reducer, undefined, () => readStored(storageKey) ?? initialBoard ?? defaultBoard());
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const focusRequest = useRef<FocusRequest | null>(null);

  // Write-through persistence. Skipping identical writes avoids echo loops with other tabs.
  useEffect(() => {
    try {
      const serialized = JSON.stringify(board);
      if (localStorage.getItem(storageKey) !== serialized) localStorage.setItem(storageKey, serialized);
    } catch {
      // Storage unavailable or full: keep working in memory.
    }
  }, [board, storageKey]);

  // Follow-up 4: another tab wrote the same key.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== storageKey || !event.newValue) return;
      try {
        const parsed: unknown = JSON.parse(event.newValue);
        if (isBoard(parsed)) dispatch({ type: 'replace', board: parsed });
      } catch {
        // Ignore malformed writes from elsewhere.
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [storageKey]);

  const dropOnColumn = (columnId: string, beforeCardId?: string) => {
    const cardId = draggingId;
    setDraggingId(null);
    if (!cardId || !board.cards[cardId]) return;
    let toIndex: number | undefined;
    if (beforeCardId && beforeCardId !== cardId) {
      toIndex = board.columns[columnId].cardIds.filter((id) => id !== cardId).indexOf(beforeCardId);
    }
    dispatch({ type: 'move', cardId, toColumnId: columnId, toIndex });
  };

  return (
    <div className={styles.board}>
      {board.columnOrder.map((columnId) => (
        <Column
          key={columnId}
          board={board}
          column={board.columns[columnId]}
          dispatch={dispatch}
          draggingId={draggingId}
          setDraggingId={setDraggingId}
          onDrop={dropOnColumn}
          focusRequest={focusRequest}
        />
      ))}
    </div>
  );
}

interface ColumnProps {
  board: BoardState;
  column: KanbanColumn;
  dispatch: Dispatch<Action>;
  draggingId: string | null;
  setDraggingId: (id: string | null) => void;
  onDrop: (columnId: string, beforeCardId?: string) => void;
  focusRequest: RefObject<FocusRequest | null>;
}

function Column({ board, column, dispatch, draggingId, setDraggingId, onDrop, focusRequest }: ColumnProps) {
  const headingId = useId();
  const [draft, setDraft] = useState('');
  const [isOver, setIsOver] = useState(false);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const title = draft.trim();
    if (!title) return;
    dispatch({ type: 'add', columnId: column.id, card: { id: newCardId(), title } });
    setDraft('');
  };

  const onDragOver = (event: DragEvent) => {
    if (!draggingId) return;
    event.preventDefault(); // allows dropping
    event.dataTransfer.dropEffect = 'move';
    if (!isOver) setIsOver(true);
  };

  return (
    <section
      aria-labelledby={headingId}
      className={`${styles.column} ${isOver ? styles.columnOver : ''}`}
      onDragOver={onDragOver}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setIsOver(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setIsOver(false);
        onDrop(column.id);
      }}
    >
      <header className={styles.columnHeader}>
        <h2 id={headingId} className={styles.columnTitle}>
          {column.title}
        </h2>
        <span className={styles.count} aria-hidden="true">
          {column.cardIds.length}
        </span>
      </header>

      {column.cardIds.length === 0 ? (
        <p className={styles.empty}>No cards</p>
      ) : (
        <ul className={styles.cards}>
          {column.cardIds.map((cardId, index) => (
            <Card
              key={cardId}
              board={board}
              card={board.cards[cardId]}
              columnId={column.id}
              index={index}
              count={column.cardIds.length}
              dispatch={dispatch}
              dragging={draggingId === cardId}
              setDraggingId={setDraggingId}
              onDropBefore={(beforeId) => {
                setIsOver(false);
                onDrop(column.id, beforeId);
              }}
              focusRequest={focusRequest}
            />
          ))}
        </ul>
      )}

      <form className={styles.addForm} onSubmit={submit}>
        <input
          className={styles.input}
          aria-label={`New card in ${column.title}`}
          placeholder="Add a card…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <button type="submit" className={styles.button}>
          Add card
        </button>
      </form>
    </section>
  );
}

interface CardProps {
  board: BoardState;
  card: KanbanCard;
  columnId: string;
  index: number;
  count: number;
  dispatch: Dispatch<Action>;
  dragging: boolean;
  setDraggingId: (id: string | null) => void;
  onDropBefore: (beforeCardId: string) => void;
  focusRequest: RefObject<FocusRequest | null>;
}

function Card({ board, card, columnId, index, count, dispatch, dragging, setDraggingId, onDropBefore, focusRequest }: CardProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(card.title);
  const inputRef = useRef<HTMLInputElement>(null);
  const editRef = useRef<HTMLButtonElement>(null);
  const moveRef = useRef<HTMLSelectElement>(null);
  const upRef = useRef<HTMLButtonElement>(null);
  const downRef = useRef<HTMLButtonElement>(null);
  const finishingRef = useRef(false);

  useEffect(() => {
    if (!editing) return;
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [editing]);

  // The card may have been re-parented (new column) or re-ordered; restore focus to the control the user used.
  useEffect(() => {
    const request = focusRequest.current;
    if (!request || request.cardId !== card.id) return;
    focusRequest.current = null;
    const candidates = {
      move: [moveRef],
      edit: [editRef],
      up: [upRef, downRef],
      down: [downRef, upRef],
    }[request.control];
    const target = candidates.map((r) => r.current).find((el) => el && !el.disabled);
    (target ?? moveRef.current)?.focus();
  }, [card.id, columnId, index, editing, focusRequest]);

  const startEdit = () => {
    finishingRef.current = false;
    setDraft(card.title);
    setEditing(true);
  };

  const finishEdit = (save: boolean) => {
    if (finishingRef.current) return; // Enter/Escape followed by blur on unmount
    finishingRef.current = true;
    const title = draft.trim();
    if (save && title) dispatch({ type: 'rename', cardId: card.id, title });
    focusRequest.current = { cardId: card.id, control: 'edit' };
    setEditing(false);
  };

  const onEditKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      finishEdit(true);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      finishEdit(false);
    }
  };

  const move = (toColumnId: string, toIndex: number | undefined, control: FocusRequest['control']) => {
    focusRequest.current = { cardId: card.id, control };
    dispatch({ type: 'move', cardId: card.id, toColumnId, toIndex });
  };

  return (
    <li
      className={`${styles.card} ${dragging ? styles.cardDragging : ''}`}
      draggable={!editing}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', card.id);
        setDraggingId(card.id);
      }}
      onDragEnd={() => setDraggingId(null)}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onDropBefore(card.id);
      }}
    >
      {editing ? (
        <input
          ref={inputRef}
          className={styles.input}
          aria-label="Card title"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onEditKeyDown}
          onBlur={() => finishEdit(true)}
        />
      ) : (
        <span className={styles.cardTitle}>{card.title}</span>
      )}

      <div className={styles.actions}>
        <button ref={editRef} type="button" className={styles.iconButton} aria-label={`Edit ${card.title}`} onClick={startEdit} disabled={editing}>
          Edit
        </button>
        <button
          type="button"
          className={styles.iconButton}
          aria-label={`Delete ${card.title}`}
          onClick={() => dispatch({ type: 'delete', cardId: card.id })}
        >
          Delete
        </button>
        <button
          ref={upRef}
          type="button"
          className={styles.iconButton}
          aria-label={`Move ${card.title} up`}
          disabled={index === 0}
          onClick={() => move(columnId, index - 1, 'up')}
        >
          ↑
        </button>
        <button
          ref={downRef}
          type="button"
          className={styles.iconButton}
          aria-label={`Move ${card.title} down`}
          disabled={index === count - 1}
          onClick={() => move(columnId, index + 1, 'down')}
        >
          ↓
        </button>
        <select
          ref={moveRef}
          className={styles.select}
          aria-label={`Move ${card.title}`}
          value={columnId}
          onChange={(e) => {
            if (e.target.value !== columnId) move(e.target.value, undefined, 'move');
          }}
        >
          {board.columnOrder.map((id) => (
            <option key={id} value={id}>
              {board.columns[id].title}
            </option>
          ))}
        </select>
      </div>
    </li>
  );
}
