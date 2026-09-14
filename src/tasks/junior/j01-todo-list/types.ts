export interface Todo {
  id: string;
  title: string;
  completed: boolean;
}

export type TodoFilter = 'all' | 'active' | 'completed';

/** localStorage key the todo array is persisted under (JSON-encoded `Todo[]`). */
export const TODO_STORAGE_KEY = 'j01-todos';

// The app takes no props. It is rendered as <TodoApp />.
export type TodoAppProps = Record<string, never>;
