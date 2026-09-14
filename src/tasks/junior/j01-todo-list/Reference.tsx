import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { TODO_STORAGE_KEY, type Todo, type TodoFilter } from './types';
import styles from './Reference.module.css';

const FILTERS: { value: TodoFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
];

function loadTodos(): Todo[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(TODO_STORAGE_KEY) ?? '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (t): t is Todo =>
        typeof t === 'object' && t !== null && typeof t.id === 'string' && typeof t.title === 'string' && typeof t.completed === 'boolean',
    );
  } catch {
    return [];
  }
}

let idCounter = 0;
const createId = () => `${Date.now().toString(36)}-${(idCounter++).toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

export default function TodoApp() {
  // Lazy initialiser: read storage once, not on every render.
  const [todos, setTodos] = useState<Todo[]>(loadTodos);
  const [filter, setFilter] = useState<TodoFilter>('all');
  const [newTitle, setNewTitle] = useState('');

  useEffect(() => {
    try {
      localStorage.setItem(TODO_STORAGE_KEY, JSON.stringify(todos));
    } catch {
      // Storage full or blocked: keep working in memory.
    }
  }, [todos]);

  const addTodo = () => {
    const title = newTitle.trim();
    if (!title) return;
    setTodos((prev) => [...prev, { id: createId(), title, completed: false }]);
    setNewTitle('');
  };

  const updateTodo = (id: string, patch: Partial<Todo>) =>
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  const deleteTodo = (id: string) => setTodos((prev) => prev.filter((t) => t.id !== id));

  // Derived values: never stored in state.
  const activeCount = todos.filter((t) => !t.completed).length;
  const hasCompleted = todos.length > activeCount;
  const visible = todos.filter((t) => (filter === 'all' ? true : filter === 'active' ? !t.completed : t.completed));

  return (
    <div className={styles.app}>
      <h2 className={styles.heading}>Todos</h2>
      <input
        className={styles.newInput}
        aria-label="New todo"
        placeholder="What needs to be done?"
        value={newTitle}
        onChange={(e) => setNewTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') addTodo();
        }}
      />

      {todos.length === 0 ? (
        <p className={styles.empty}>Nothing to do yet</p>
      ) : (
        <ul className={styles.list}>
          {visible.map((todo) => (
            <TodoRow
              key={todo.id}
              todo={todo}
              onToggle={() => updateTodo(todo.id, { completed: !todo.completed })}
              onRename={(title) => (title ? updateTodo(todo.id, { title }) : deleteTodo(todo.id))}
              onDelete={() => deleteTodo(todo.id)}
            />
          ))}
        </ul>
      )}

      <footer className={styles.footer}>
        <span>
          {activeCount} {activeCount === 1 ? 'item' : 'items'} left
        </span>
        <div className={styles.filters} role="group" aria-label="Filter todos">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              className={styles.filterButton}
              aria-pressed={filter === f.value}
              onClick={() => setFilter(f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>
        {hasCompleted && (
          <button type="button" className={styles.linkButton} onClick={() => setTodos((prev) => prev.filter((t) => !t.completed))}>
            Clear completed
          </button>
        )}
      </footer>
    </div>
  );
}

interface TodoRowProps {
  todo: Todo;
  onToggle: () => void;
  onRename: (title: string) => void;
  onDelete: () => void;
}

function TodoRow({ todo, onToggle, onRename, onDelete }: TodoRowProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(todo.title);
  const inputRef = useRef<HTMLInputElement>(null);
  // Guards against blur firing after Enter/Escape already finished the edit.
  const finishedRef = useRef(false);

  useEffect(() => {
    if (!editing) return;
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [editing]);

  const startEditing = () => {
    finishedRef.current = false;
    setDraft(todo.title);
    setEditing(true);
  };

  const finish = (save: boolean) => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setEditing(false);
    if (save) onRename(draft.trim());
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') finish(true);
    else if (e.key === 'Escape') finish(false);
  };

  return (
    <li className={styles.row}>
      {editing ? (
        <input
          ref={inputRef}
          className={styles.editInput}
          aria-label="Edit todo"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => finish(true)}
        />
      ) : (
        <>
          <input type="checkbox" className={styles.checkbox} aria-label={todo.title} checked={todo.completed} onChange={onToggle} />
          {/* The title is a separate element (not a <label>) so double-clicking it doesn't toggle the checkbox. */}
          <span className={`${styles.title} ${todo.completed ? styles.done : ''}`} onDoubleClick={startEditing}>
            {todo.title}
          </span>
          <button type="button" className={styles.iconButton} aria-label={`Edit ${todo.title}`} onClick={startEditing}>
            ✎
          </button>
          <button type="button" className={styles.iconButton} aria-label={`Delete ${todo.title}`} onClick={onDelete}>
            ✕
          </button>
        </>
      )}
    </li>
  );
}
