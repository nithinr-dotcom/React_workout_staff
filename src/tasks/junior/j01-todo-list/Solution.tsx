import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type SubmitEvent,
} from "react";

interface Todo {
  id: string;
  title: string;
  completed: boolean;
}
type Filter = "all" | "completed" | "active";
const TODO_KEY = "J01";
const getTodos = () => {
  try {
    const raw = localStorage.getItem(TODO_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Todo[]) : [];
  } catch {
    return [];
  }
};
// BEFORE: `label: Filter` with lowercase labels, and the button rendered
// `item.value`, so the label field was never used.
// WHY: a button's text IS its accessible name. Screen readers announce it and
// tests query it (`getByRole("button", { name: "All" })`). The internal value
// ("all") and the human text ("All") are different things, so keep both.
// NOW: `label` is a plain display string, and the button renders it.
const FILTER: { label: string; value: Filter }[] = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Completed", value: "completed" },
];
export default function TodoApp() {
  const [todoList, setTodoList] = useState(getTodos);
  const [filter, setFilter] = useState<Filter>("all");
  const [title, setTitle] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [openId, setOpenId] = useState<null | string>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const blurRef = useRef(false);
  const visibleTodos = todoList.filter((item) =>
    filter === "all"
      ? true
      : filter === "active"
        ? !item.completed
        : item.completed,
  );
  const addTodo = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();

    const value = title.trim();
    if (!value) return;
    // BEFORE: `{ id: ..., title, completed: false }`
    // WHY: `title` is the raw input, so "  milk  " was saved with its spaces.
    // The trimmed copy in `value` was only used for the blank check.
    // NOW: save the trimmed `value`.
    setTodoList((prev) => [
      ...prev,
      { id: crypto.randomUUID(), title: value, completed: false },
    ]);
    setTitle("");
  };
  const toggleComplete = (id: string) => {
    setTodoList((prev) =>
      prev.map((item) => {
        if (item.id === id) return { ...item, completed: !item.completed };
        return item;
      }),
    );
  };
  const startEditing = (item: Todo) => {
    // Some browsers (e.g. Firefox) don't fire blur when the focused input is
    // removed. Without this reset, the `true` left over from Escape would make
    // the first real click-away in this edit get skipped.
    blurRef.current = false;
    setOpenId(item.id);
    setNewTitle(item.title);
    // Focus is NOT done here: the input doesn't exist until the next render,
    // so inputRef.current would be null. The useEffect on [openId] does it.
  };
  // Correct: set the "skip blur" flag FIRST, then act. Enter and Escape
  // finish the edit themselves, so the blur that can follow when the input
  // unmounts must not save again (or undo a cancel).
  // History: this used to check `title` (the NEW todo input) instead of
  // `newTitle`, and used "Esc" instead of "Escape", so nothing ran.
  const keyDownHandler = (e: KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case "Enter":
        blurRef.current = true;
        editTodoList();
        return;
      case "Escape":
        blurRef.current = true;
        cancelEdit();
        return;
      default:
        return;
    }
  };
  // BEFORE:
  //   if (!value) return;
  //   ...map(...) returning `{ ...item, title: newTitle }`
  // WHY (1): the README says saving an empty title DELETES the todo. The early
  // return just left the editor open instead.
  // WHY (2): that early return also broke the blur flag. Enter set
  // `blurRef.current = true`, then this returned without closing the editor,
  // so the flag stayed `true` and the next real blur was skipped.
  // WHY (3): it saved `newTitle` (untrimmed) instead of the trimmed `value`.
  // NOW: an empty value removes the todo with `filter`, anything else saves the
  // trimmed value with `map`, and the editor ALWAYS closes, so there is no path
  // that leaves it open with a stale flag.
  const editTodoList = () => {
    const value = newTitle.trim();
    setTodoList((prev) =>
      value
        ? prev.map((item) =>
            item.id === openId ? { ...item, title: value } : item,
          )
        : prev.filter((item) => item.id !== openId),
    );
    setOpenId(null);
  };
  const cancelEdit = () => {
    setOpenId(null);
    setNewTitle("");
  };
  // Correct: a blur caused by Enter/Escape is skipped (and the flag is reset).
  // Any other blur means the user clicked away, which saves per the README.
  // History: this used to call cancelEdit(), which threw the edit away.
  // A ref (not state) is used because it changes immediately and doesn't
  // re-render; a state update wouldn't be visible to a blur in the same tick.
  const blurHandler = () => {
    if (blurRef.current) {
      blurRef.current = false;
      return;
    }
    editTodoList();
  };
  useEffect(() => {
    const raw = JSON.stringify(todoList);
    localStorage.setItem(TODO_KEY, raw);
  }, [todoList]);
  useEffect(() => {
    if (openId !== null) inputRef.current?.focus();
  }, [openId]);
  return (
    <div>
      <div>
        <form onSubmit={addTodo}>
          {/* BEFORE: <label aria-label="new todo"><input /></label>
              WHY: aria-label names the element it is ON. Here it named the
              <label>, not the input, and the <label> had no text inside, so
              the input itself had no accessible name at all. A screen reader
              announced just "edit text", and getByRole("textbox",
              { name: "New todo" }) found nothing. (Also, the name is
              case-sensitive in the test: "New todo", not "new todo".)
              NOW: put aria-label directly on the input. The two valid options:
                1. aria-label="..." on the input (no visible text), or
                2. <label>Visible text <input /></label> (wrapping), or
                   <label htmlFor="id"> + <input id="id">.
              Option 2 is better for sighted users when you have room for it;
              the placeholder is NOT a label (it disappears once you type). */}
          <input
            aria-label="New todo"
            placeholder="What needs to be done?"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </form>
        {/* BEFORE: <div> for the list and <div> for each row.
            WHY: divs have no meaning. With <ul>/<li>, a screen reader says
            "list, 3 items" and lets the user jump between items, so they know
            how many todos there are without reading every one.
            NOW: <ul> + <li>. */}
        <ul>
          {visibleTodos.map((item) => (
            <li key={item.id}>
              {openId === item.id ? (
                // BEFORE: no label, so it was announced as just "edit text".
                // WHY: when focus jumps into this input, the user needs to
                // hear what it is for.
                // NOW: aria-label="Edit todo" (the name the tests query).
                <input
                  aria-label="Edit todo"
                  value={newTitle}
                  ref={inputRef}
                  onKeyDown={keyDownHandler}
                  onChange={(e) => setNewTitle(e.target.value)}
                  onBlur={blurHandler}
                />
              ) : (
                <>
                  {/* BEFORE: an unlabelled checkbox, announced as just
                      "checkbox, not checked". With 10 rows, the user can't
                      tell which todo each checkbox belongs to.
                      NOW: aria-label={item.title}, so it reads "Buy milk,
                      checkbox, not checked".
                      Why not wrap the title in a <label> instead? Clicking a
                      label clicks its checkbox, so double-clicking the title
                      to edit would toggle the todo twice on the way (a README
                      edge case). aria-label names it without that side effect.
                      Order: the checkbox comes first, matching the visual and
                      tab order users expect (checkbox, then text). */}
                  <input
                    type="checkbox"
                    aria-label={item.title}
                    checked={item.completed}
                    onChange={() => toggleComplete(item.id)}
                  />
                  {/* Double-click is a mouse-only shortcut. That's fine as an
                      extra, but it can't be the ONLY way to edit (see the Edit
                      button below). The line-through is the visual cue for
                      "completed"; the checkbox state carries the same info
                      for screen readers, so colour/style isn't the only signal. */}
                  <span
                    onDoubleClick={() => startEditing(item)}
                    style={{
                      textDecoration: item.completed ? "line-through" : undefined,
                    }}
                  >
                    {item.title}
                  </span>
                  {/* NEW: a real <button> to edit.
                      WHY: a <span> with onDoubleClick can't be focused with
                      Tab or triggered with Enter/Space, so keyboard and
                      screen-reader users had no way to edit at all. A
                      <button> gets focus, Enter and Space for free.
                      aria-label: the visible text is just an icon, which
                      reads as "pencil" or nothing. And "Edit" alone would be
                      repeated on every row ("Edit, Edit, Edit..."), so the
                      title is included to make each one unique: "Edit Buy milk".
                      type="button": a <button> defaults to type="submit",
                      which would submit any form it sits inside. */}
                  <button
                    type="button"
                    aria-label={`Edit ${item.title}`}
                    onClick={() => startEditing(item)}
                  >
                    ✎
                  </button>
                  {/* TODO (your turn): a Delete button follows the same
                      pattern: type="button", aria-label={`Delete ${item.title}`},
                      and an onClick that calls a deleteTodo(id) using filter. */}
                </>
              )}
            </li>
          ))}
        </ul>
      </div>
      {/* BEFORE: a plain <div> of buttons with no state shown.
          WHY: sighted users might see which filter is active (if styled), but
          a screen reader had no way to know. Two attributes fix that:
          - role="group" + aria-label: announces "Filter todos, group" when
            entering, so the three buttons are understood as one control.
          - aria-pressed: turns each button into a toggle button. The reader
            says "All, toggle button, pressed" or "... not pressed".
          NOW: both added, and the button text uses `label` ("All"). */}
      <div role="group" aria-label="Filter todos">
        {FILTER.map((item) => (
          <button
            key={item.value}
            type="button"
            aria-pressed={filter === item.value}
            onClick={() => setFilter(item.value)}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
