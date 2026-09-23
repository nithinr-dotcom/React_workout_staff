import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
  type SubmitEvent,
} from "react";
import styles from "./Solution.module.css";
import { TODO_STORAGE_KEY, type Todo, type TodoFilter } from "./types";

// Runs once per mount (via the lazy useState initialiser). Any missing or
// malformed data falls back to an empty list instead of crashing.
function loadTodos(): Todo[] {
  try {
    const raw = localStorage.getItem(TODO_STORAGE_KEY);
    if (raw === null) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Todo[]) : [];
  } catch {
    return [];
  }
}

const FILTERS: { value: TodoFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
];

export default function TodoApp() {
  // Pass the function itself (no parentheses) so it only runs on mount.
  const [todos, setTodos] = useState<Todo[]>(loadTodos);
  const [newTitle, setNewTitle] = useState("");
  const [filter, setFilter] = useState<TodoFilter>("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  // Set by Enter/Escape so the blur that follows the input unmounting
  // doesn't save a second time (or undo a cancel).
  const skipBlurRef = useRef(false);
  const editInputRef = useRef<HTMLInputElement>(null);

  // One place writes storage: whenever the list changes, save it.
  useEffect(() => {
    localStorage.setItem(TODO_STORAGE_KEY, JSON.stringify(todos));
  }, [todos]);

  // Focus the edit input once it has mounted.
  useEffect(() => {
    if (editingId !== null) editInputRef.current?.focus();
  }, [editingId]);

  // Derived state: computed each render, never stored.
  const visibleTodos = todos.filter((t) =>
    filter === "active"
      ? !t.completed
      : filter === "completed"
        ? t.completed
        : true,
  );
  const activeCount = todos.filter((t) => !t.completed).length;
  const hasCompleted = todos.length > activeCount;

  const addTodo = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const title = newTitle.trim();
    if (!title) return;
    setTodos((prev) => [
      ...prev,
      { id: crypto.randomUUID(), title, completed: false },
    ]);
    setNewTitle("");
  };

  // Immutable updates: a new object for the changed todo, the rest as-is.
  const toggleTodo = (id: string) => {
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)),
    );
  };

  const deleteTodo = (id: string) => {
    setTodos((prev) => prev.filter((t) => t.id !== id));
  };

  const clearCompleted = () => {
    setTodos((prev) => prev.filter((t) => !t.completed));
  };

  const startEdit = (todo: Todo) => {
    skipBlurRef.current = false;
    setEditingId(todo.id);
    setEditTitle(todo.title);
  };

  const commitEdit = () => {
    if (editingId === null) return;
    const id = editingId;
    const title = editTitle.trim();
    // An empty title deletes the todo (TodoMVC behaviour).
    setTodos((prev) =>
      title
        ? prev.map((t) => (t.id === id ? { ...t, title } : t))
        : prev.filter((t) => t.id !== id),
    );
    setEditingId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const onEditKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      skipBlurRef.current = true;
      commitEdit();
    } else if (e.key === "Escape") {
      skipBlurRef.current = true;
      cancelEdit();
    }
  };

  const onEditBlur = () => {
    if (skipBlurRef.current) {
      skipBlurRef.current = false;
      return;
    }
    commitEdit();
  };

  return (
    <div className={styles.root}>
      <form onSubmit={addTodo}>
        <input
          aria-label="New todo"
          j
          placeholder="What needs to be done?"
          value={newTitle}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            setNewTitle(e.target.value)
          }
        />
      </form>

      {todos.length === 0 ? (
        <p>Nothing to do yet</p>
      ) : (
        <>
          <ul>
            {visibleTodos.map((todo) => (
              <li key={todo.id}>
                {editingId === todo.id ? (
                  <input
                    ref={editInputRef}
                    aria-label="Edit todo"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onKeyDown={onEditKeyDown}
                    onBlur={onEditBlur}
                  />
                ) : (
                  <>
                    {/* aria-label, not a wrapping <label>: double-clicking
                        text inside a label would also toggle the checkbox. */}
                    <input
                      type="checkbox"
                      aria-label={todo.title}
                      checked={todo.completed}
                      onChange={() => toggleTodo(todo.id)}
                    />
                    <span
                      onDoubleClick={() => startEdit(todo)}
                      style={{
                        textDecoration: todo.completed
                          ? "line-through"
                          : undefined,
                      }}
                    >
                      {todo.title}
                    </span>
                    <button
                      type="button"
                      aria-label={`Edit ${todo.title}`}
                      onClick={() => startEdit(todo)}
                    >
                      ✎
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete ${todo.title}`}
                      onClick={() => deleteTodo(todo.id)}
                    >
                      ✕
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>

          <footer>
            <span>
              {activeCount} {activeCount === 1 ? "item" : "items"} left
            </span>
            <div role="group" aria-label="Filter todos">
              {FILTERS.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  aria-pressed={filter === f.value}
                  onClick={() => setFilter(f.value)}
                >
                  {f.label}
                </button>
              ))}
            </div>
            {hasCompleted && (
              <button type="button" onClick={clearCompleted}>
                Clear completed
              </button>
            )}
          </footer>
        </>
      )}
    </div>
  );
}
