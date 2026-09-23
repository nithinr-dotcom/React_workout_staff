import { useEffect, useState, type ChangeEvent, type SubmitEvent } from "react";

const TODO_KEY = "j01-todos";
interface Todo {
  id: string;
  title: string;
  completed: boolean;
}
type Filter_Type = "all" | "active" | "completed";
const FILTER: { value: Filter_Type; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
];
const loadTodos = () => {
  try {
    const todos = localStorage.getItem(TODO_KEY);
    if (!todos) return [];
    const parsedTodo: unknown = JSON.parse(todos);

    return Array.isArray(parsedTodo) ? (parsedTodo as Todo[]) : [];
  } catch {
    return [];
  }
};
export default function TodoApp() {
  const [todos, setTodos] = useState<Todo[]>(loadTodos);
  const [newTitle, setNewTitle] = useState("");
  const addTodo = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (newTitle.trim() !== "")
      setTodos((prev) => [
        ...prev,
        { id: crypto.randomUUID(), title: newTitle, completed: false },
      ]);
    setNewTitle("");
  };
  useEffect(() => {
    localStorage.setItem(TODO_KEY, JSON.stringify(todos));
  }, [todos]);
  console.log({ todos });
  return (
    <div>
      <form onSubmit={addTodo}>
        <input
          aria-label="new todo"
          placeholder="What need to be added"
          value={newTitle}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            setNewTitle(e.target.value)
          }
        />
      </form>
      <div>
        <select>
          {FILTER.map((fl) => (
            <option key={fl.label} value={fl.value}>
              {fl.label}
            </option>
          ))}
        </select>
        {todos.length === 0 ? <p>Nothing To Do Yet</p> : <div></div>}
      </div>
    </div>
  );
}
