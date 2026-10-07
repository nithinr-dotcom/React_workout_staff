import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
  type SubmitEvent,
} from "react";
import styles from "./Solution.module.css";
// BEFORE: `Todo`, the filter type and the "j01-todos" key were redeclared here.
// WHY: two copies drift apart; the tests read storage via TODO_STORAGE_KEY.
// NOW: import the shared definitions from ./types.
import { TODO_STORAGE_KEY, type Todo, type TodoFilter } from "./types";

const FILTER: { value: TodoFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
];

// Unchanged: this was already right. Bad or missing data falls back to [].
const loadTodos = (): Todo[] => {
  try {
    const todos = localStorage.getItem(TODO_STORAGE_KEY);
    if (!todos) return [];
    const parsedTodo: unknown = JSON.parse(todos);

    return Array.isArray(parsedTodo) ? (parsedTodo as Todo[]) : [];
  } catch {
    return [];
  }
};

export default function TodoApp() {
  const [todos, setTodos] = useState<Todo[]>(loadTodos);
  const [filter, setFilter] = useState<TodoFilter>("all");
  const [newTitle, setNewTitle] = useState("");

  const [editId, setEditId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const editRef = useRef<HTMLInputElement>(null);
  // A plain value ref (not attached to JSX). Enter/Escape set it so the blur
  // that can follow the input unmounting doesn't save again or undo a cancel.
  const skipBlurRef = useRef(false);

  // BEFORE: `filter === "all" ? todos : ...`
  // WHY: it returned an array, which only worked because arrays are truthy.
  // NOW: return a real boolean for every branch.
  const filteredTodo = todos.filter((td) =>
    filter === "active"
      ? !td.completed
      : filter === "completed"
        ? td.completed
        : true,
  );
  // NEW: derived values are computed each render, never stored in state
  // (storing them would mean keeping two things in sync by hand).
  const activeCount = todos.filter((td) => !td.completed).length;
  const hasCompleted = todos.length > activeCount;

  // BEFORE: `if (newTitle.trim() !== "") ...` wrapped the save, trim() ran
  // twice, and setEditId(null) was called here too.
  // WHY: the editor has already closed on blur by the time you submit, so
  // resetting editId did nothing.
  // NOW: trim once, return early on blank input, save the trimmed value.
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

  const toggleTodo = (id: string) => {
    setTodos((prev) =>
      prev.map((data) =>
        data.id === id ? { ...data, completed: !data.completed } : data,
      ),
    );
  };

  // NEW: delete and clear completed. Same immutable pattern: filter returns a
  // new array, and the old one is never changed.
  const deleteTodo = (id: string) => {
    setTodos((prev) => prev.filter((data) => data.id !== id));
  };
  const clearCompleted = () => {
    setTodos((prev) => prev.filter((data) => !data.completed));
  };

  // BEFORE: didn't reset skipBlurRef.
  // WHY: some browsers (e.g. Firefox) don't fire blur when a focused input is
  // removed, so after Escape the flag stayed `true`, and the next click-away
  // was swallowed: no save, and the editor stayed open.
  // NOW: every edit starts with a clean flag.
  const toggleEdit = (todo: Todo) => {
    skipBlurRef.current = false;
    setEditId(todo.id);
    setEditTitle(todo.title);
  };
  const editTodo = (e: ChangeEvent<HTMLInputElement>) => {
    setEditTitle(e.target.value);
  };
  // BEFORE: no guard, and editId was read inside the updater.
  // NOW: bail out if nothing is being edited; copy the id into a local so the
  // updater doesn't depend on state read later.
  const commitEdit = () => {
    if (editId === null) return;
    const id = editId;
    const value = editTitle.trim();
    // An empty title deletes the todo (TodoMVC behaviour).
    setTodos((prev) =>
      value
        ? prev.map((v) => (v.id === id ? { ...v, title: value } : v))
        : prev.filter((v) => v.id !== id),
    );
    setEditId(null);
  };
  const cancelEdit = () => {
    setEditTitle("");
    setEditId(null);
  };

  // BEFORE: set the flag *after* commitEdit()/cancelEdit().
  // WHY: that worked, because React re-renders (and any blur fires) only after
  // this handler ends, but "put up the note first, then act" is the safer habit.
  // NOW: set the flag first.
  const onKeydown = (e: KeyboardEvent<HTMLInputElement>) => {
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

  useEffect(() => {
    localStorage.setItem(TODO_STORAGE_KEY, JSON.stringify(todos));
  }, [todos]);
  // Focus after the render that mounted the input (focusing inside toggleEdit
  // would run before the input exists, so editRef.current would be null).
  useEffect(() => {
    if (editId !== null) editRef.current?.focus();
  }, [editId]);

  // BEFORE: a console.log({ todos }) ran on every render. Removed.
  return (
    <div className={styles.root}>
      <form onSubmit={addTodo}>
        {/* BEFORE: aria-label="new todo". The accessible name is what screen
            readers announce and what tests query ("New todo"). */}
        <input
          aria-label="New todo"
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
          {/* BEFORE: <div> for the list and each row.
              NOW: <ul>/<li>, so screen readers announce "list, 3 items". */}
          <ul>
            {filteredTodo.map((td) => (
              <li key={td.id}>
                {editId === td.id ? (
                  // BEFORE: no aria-label, so it was announced as just "edit text".
                  <input
                    aria-label="Edit todo"
                    ref={editRef}
                    value={editTitle}
                    onChange={editTodo}
                    onKeyDown={onKeydown}
                    onBlur={onEditBlur}
                  />
                ) : (
                  <>
                    {/* BEFORE: an unlabelled checkbox read as just "checkbox".
                        NOW: labelled with the todo's title. */}
                    <input
                      type="checkbox"
                      aria-label={td.title}
                      checked={td.completed}
                      onChange={() => toggleTodo(td.id)}
                    />
                    <span
                      onDoubleClick={() => toggleEdit(td)}
                      style={{
                        textDecoration: td.completed
                          ? "line-through"
                          : undefined,
                      }}
                    >
                      {td.title}
                    </span>
                    {/* NEW: double-click on a <span> can't be reached by
                        keyboard; a real button can. aria-label gives the
                        icon-only buttons a name, unique per row. */}
                    <button
                      type="button"
                      aria-label={`Edit ${td.title}`}
                      onClick={() => toggleEdit(td)}
                    >
                      ✎
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete ${td.title}`}
                      onClick={() => deleteTodo(td.id)}
                    >
                      ✕
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>

          {/* NEW: todos exist but none match the filter; the page used to go blank. */}
          {filteredTodo.length === 0 && <p>No {filter} todos</p>}

          <footer>
            {/* NEW: items-left counter, with singular/plural handled. */}
            <span>
              {activeCount} {activeCount === 1 ? "item" : "items"} left
            </span>
            {/* BEFORE: a <select> dropdown.
                NOW: toggle buttons; all options are visible and one click
                away, and aria-pressed tells screen readers which is active.
                type="button" so they never submit a form. */}
            <div role="group" aria-label="Filter todos">
              {FILTER.map((fl) => (
                <button
                  key={fl.value}
                  type="button"
                  aria-pressed={filter === fl.value}
                  onClick={() => setFilter(fl.value)}
                >
                  {fl.label}
                </button>
              ))}
            </div>
            {/* NEW: only shown when there is something to clear. */}
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
