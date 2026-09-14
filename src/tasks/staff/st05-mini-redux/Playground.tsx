import { Component, useMemo, useState, type ReactNode } from 'react';
import type { Action, Middleware, MiniReduxModule, Store } from './types';

interface Todo {
  id: number;
  text: string;
  done: boolean;
}
interface RootState {
  counter: { value: number };
  todos: { items: Todo[] };
}

const counterReducer = (state = { value: 0 }, action: Action) =>
  action.type === 'counter/inc' ? { value: state.value + 1 } : state;

const todosReducer = (state: RootState['todos'] = { items: [] }, action: Action): RootState['todos'] => {
  switch (action.type) {
    case 'todos/add':
      return { items: [...state.items, { id: Date.now(), text: action.text as string, done: false }] };
    case 'todos/toggle':
      return { items: state.items.map((t) => (t.id === action.id ? { ...t, done: !t.done } : t)) };
    default:
      return state;
  }
};

const shallowEqual = (a: Record<string, unknown>, b: Record<string, unknown>) => {
  const ka = Object.keys(a);
  return ka.length === Object.keys(b).length && ka.every((k) => Object.is(a[k], b[k]));
};

class Boundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) return <p style={{ color: '#b91c1c' }}>Error: {this.state.error.message}</p>;
    return this.props.children;
  }
}

/** Shows how often a component rendered, so you can see selector precision. */
function useRenderCount() {
  const [counter] = useState(() => ({ n: 0 }));
  counter.n++;
  return counter.n;
}

type ImplProps = { impl: MiniReduxModule };

function CounterPanel({ impl }: ImplProps) {
  const value = impl.useSelector((s: RootState) => s.counter.value);
  const dispatch = impl.useDispatch();
  const renders = useRenderCount();
  return (
    <section>
      <h3>Counter (renders: {renders})</h3>
      <button type="button" onClick={() => dispatch({ type: 'counter/inc' })}>
        Count: {value}
      </button>{' '}
      <button
        type="button"
        onClick={() =>
          dispatch((d: (a: Action) => void) => {
            setTimeout(() => d({ type: 'counter/inc' }), 500);
          })
        }
      >
        +1 after 500ms (thunk)
      </button>
    </section>
  );
}

function TodoStats({ impl }: ImplProps) {
  const { total, done } = impl.useSelector(
    (s: RootState) => ({ total: s.todos.items.length, done: s.todos.items.filter((t) => t.done).length }),
    shallowEqual,
  );
  const renders = useRenderCount();
  return (
    <p>
      {done}/{total} done (renders: {renders})
    </p>
  );
}

function TodoPanel({ impl }: ImplProps) {
  const items = impl.useSelector((s: RootState) => s.todos.items);
  const dispatch = impl.useDispatch();
  const [text, setText] = useState('');
  const renders = useRenderCount();
  return (
    <section>
      <h3>Todos (renders: {renders})</h3>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (text.trim()) dispatch({ type: 'todos/add', text: text.trim() });
          setText('');
        }}
      >
        <input aria-label="New todo" value={text} onChange={(e) => setText(e.target.value)} />{' '}
        <button type="submit">Add</button>
      </form>
      <ul>
        {items.map((t) => (
          <li key={t.id}>
            <label>
              <input type="checkbox" checked={t.done} onChange={() => dispatch({ type: 'todos/toggle', id: t.id })} />{' '}
              {t.text}
            </label>
          </li>
        ))}
      </ul>
      <TodoStats impl={impl} />
    </section>
  );
}

export default function Playground({ impl }: { impl: MiniReduxModule }) {
  const [log, setLog] = useState<string[]>([]);

  const { store, error } = useMemo((): { store: Store<RootState> | null; error: string | null } => {
    const logger: Middleware = () => (next) => (action) => {
      if (typeof action === 'object') setLog((l) => [String(action.type), ...l].slice(0, 8));
      return next(action);
    };
    const thunk: Middleware =
      ({ dispatch, getState }) =>
      (next) =>
      (action) =>
        typeof action === 'function' ? action(dispatch, getState) : next(action);
    try {
      const reducer = impl.combineReducers<RootState>({ counter: counterReducer, todos: todosReducer });
      return { store: impl.createStore(reducer, undefined, impl.applyMiddleware(thunk, logger)), error: null };
    } catch (e) {
      return { store: null, error: (e as Error).message };
    }
  }, [impl]);

  // Memoised so the Playground's own log updates don't re-render the panels and skew their render counts.
  const tree = useMemo(() => {
    if (!store) return null;
    const { Provider } = impl;
    return (
      <Boundary>
        <Provider store={store}>
          <CounterPanel impl={impl} />
          <TodoPanel impl={impl} />
        </Provider>
      </Boundary>
    );
  }, [impl, store]);

  if (!store) return <p style={{ color: '#b91c1c' }}>Error: {error}</p>;

  return (
    <div style={{ fontFamily: 'system-ui', display: 'grid', gap: 16, maxWidth: 560 }}>
      <p>Each panel shows its render count. Changing one slice should not re-render the other panel.</p>
      {tree}
      <section>
        <h3>Middleware log</h3>
        <ol style={{ fontFamily: 'monospace', fontSize: 13 }}>
          {log.map((l, i) => (
            <li key={i}>{l}</li>
          ))}
        </ol>
      </section>
    </div>
  );
}
