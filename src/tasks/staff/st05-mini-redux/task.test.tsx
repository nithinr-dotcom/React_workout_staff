// ⚠ Unverified: written before the reference solution. If a test looks wrong, trust the README.
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { pickTarget } from '../../../test/target';
import * as Reference from './Reference';
import * as Solution from './Solution';
import type { Action, Middleware } from './types';

const { impl, describeTask, describeFollowUp } = pickTarget(Solution, Reference);

interface CounterState {
  value: number;
}
interface TodosState {
  items: string[];
}
interface RootState {
  counter: CounterState;
  todos: TodosState;
}

const counter = (state: CounterState = { value: 0 }, action: Action): CounterState => {
  switch (action.type) {
    case 'counter/inc':
      return { value: state.value + 1 };
    case 'counter/add':
      return { value: state.value + (action.amount as number) };
    default:
      return state;
  }
};

const todos = (state: TodosState = { items: [] }, action: Action): TodosState =>
  action.type === 'todos/add' ? { items: [...state.items, action.text as string] } : state;

const makeStore = () => impl.createStore<RootState>(impl.combineReducers<RootState>({ counter, todos }));

const shallowEqual = (a: Record<string, unknown>, b: Record<string, unknown>) => {
  const ka = Object.keys(a);
  const kb = Object.keys(b);
  return ka.length === kb.length && ka.every((k) => Object.is(a[k], b[k]));
};

describeTask('Mini Redux', () => {
  it('initialises state from the reducer, and preloadedState takes precedence', () => {
    const store = impl.createStore(counter);
    expect(store.getState()).toEqual({ value: 0 });
    const preloaded = impl.createStore(counter, { value: 10 });
    expect(preloaded.getState()).toEqual({ value: 10 });
    preloaded.dispatch({ type: 'counter/inc' });
    expect(preloaded.getState()).toEqual({ value: 11 });
  });

  it('notifies subscribers after dispatch and stops after unsubscribe', () => {
    const store = impl.createStore(counter);
    const listener = vi.fn(() => store.getState().value);
    const unsubscribe = store.subscribe(listener);
    store.dispatch({ type: 'counter/inc' });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveLastReturnedWith(1);
    unsubscribe();
    store.dispatch({ type: 'counter/inc' });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('does not skip other listeners when one unsubscribes during notification', () => {
    const store = impl.createStore(counter);
    const second = vi.fn();
    const unsubscribeFirst: () => void = store.subscribe(() => unsubscribeFirst());
    store.subscribe(second);
    store.dispatch({ type: 'counter/inc' });
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('combineReducers builds each slice and keeps the root reference when nothing changed', () => {
    const store = makeStore();
    expect(store.getState()).toEqual({ counter: { value: 0 }, todos: { items: [] } });

    const before = store.getState();
    store.dispatch({ type: 'unknown/action' });
    expect(store.getState()).toBe(before);

    store.dispatch({ type: 'todos/add', text: 'write tests' });
    const after = store.getState();
    expect(after).not.toBe(before);
    expect(after.counter).toBe(before.counter);
    expect(after.todos.items).toEqual(['write tests']);
  });

  it('applyMiddleware runs middleware in order and middleware dispatch goes through the whole chain', () => {
    const log: string[] = [];
    const logger =
      (name: string): Middleware =>
      () =>
      (next) =>
      (action) => {
        if (typeof action !== 'function') log.push(`${name}:${action.type}`);
        return next(action);
      };
    const thunk: Middleware =
      ({ dispatch, getState }) =>
      (next) =>
      (action) =>
        typeof action === 'function' ? action(dispatch, getState) : next(action);

    const store = impl.createStore(counter, undefined, impl.applyMiddleware(thunk, logger('a'), logger('b')));
    const result = store.dispatch((dispatch: (a: Action) => void, getState: () => CounterState) => {
      dispatch({ type: 'counter/add', amount: 5 });
      return getState().value;
    });

    expect(result).toBe(5);
    expect(store.getState()).toEqual({ value: 5 });
    expect(log).toEqual(['a:counter/add', 'b:counter/add']);
  });

  it('useSelector renders the selected value and updates after useDispatch dispatches', async () => {
    const user = userEvent.setup();
    const store = makeStore();
    function Counter() {
      const value = impl.useSelector((s: RootState) => s.counter.value);
      const dispatch = impl.useDispatch();
      return (
        <button type="button" onClick={() => dispatch({ type: 'counter/inc' })}>
          Count: {value}
        </button>
      );
    }
    render(
      <impl.Provider store={store}>
        <Counter />
      </impl.Provider>,
    );
    await user.click(screen.getByRole('button', { name: 'Count: 0' }));
    expect(screen.getByRole('button', { name: 'Count: 1' })).toBeInTheDocument();
    act(() => {
      store.dispatch({ type: 'counter/inc' });
    });
    expect(screen.getByRole('button', { name: 'Count: 2' })).toBeInTheDocument();
  });

  it('does not re-render a component when an unrelated slice changes', () => {
    const store = makeStore();
    let renders = 0;
    function Counter() {
      const value = impl.useSelector((s: RootState) => s.counter.value);
      renders++;
      return <p>Count: {value}</p>;
    }
    render(
      <impl.Provider store={store}>
        <Counter />
      </impl.Provider>,
    );
    const initialRenders = renders;

    act(() => {
      store.dispatch({ type: 'todos/add', text: 'unrelated' });
    });
    expect(renders).toBe(initialRenders);

    act(() => {
      store.dispatch({ type: 'counter/inc' });
    });
    expect(screen.getByText('Count: 1')).toBeInTheDocument();
    expect(renders).toBeGreaterThan(initialRenders);
  });

  it('uses equalityFn to skip re-renders for selectors that return new objects', () => {
    const store = makeStore();
    let renders = 0;
    function Summary() {
      const { value } = impl.useSelector((s: RootState) => ({ value: s.counter.value }), shallowEqual);
      renders++;
      return <p>Value: {value}</p>;
    }
    render(
      <impl.Provider store={store}>
        <Summary />
      </impl.Provider>,
    );
    const initialRenders = renders;
    act(() => {
      store.dispatch({ type: 'todos/add', text: 'unrelated' });
    });
    expect(renders).toBe(initialRenders);
    act(() => {
      store.dispatch({ type: 'counter/add', amount: 3 });
    });
    expect(screen.getByText('Value: 3')).toBeInTheDocument();
  });

  it('uses the latest selector when props change', () => {
    const store = makeStore();
    store.dispatch({ type: 'todos/add', text: 'first' });
    store.dispatch({ type: 'todos/add', text: 'second' });
    function Todo({ index }: { index: number }) {
      const text = impl.useSelector((s: RootState) => s.todos.items[index]);
      return <p>Todo: {text}</p>;
    }
    const { rerender } = render(
      <impl.Provider store={store}>
        <Todo index={0} />
      </impl.Provider>,
    );
    expect(screen.getByText('Todo: first')).toBeInTheDocument();
    rerender(
      <impl.Provider store={store}>
        <Todo index={1} />
      </impl.Provider>,
    );
    expect(screen.getByText('Todo: second')).toBeInTheDocument();
  });
});

describeFollowUp(1, 'createSelector', () => {
  it('recomputes only when an input selector result changes', () => {
    const combiner = vi.fn((items: string[], value: number) => `${items.length}/${value}`);
    const select = impl.createSelector<RootState, [string[], number], string>(
      [(s: RootState) => s.todos.items, (s: RootState) => s.counter.value],
      combiner,
    );
    const store = makeStore();
    expect(select(store.getState())).toBe('0/0');
    expect(select(store.getState())).toBe('0/0');
    expect(combiner).toHaveBeenCalledTimes(1);

    store.dispatch({ type: 'unknown/action' });
    select(store.getState());
    expect(combiner).toHaveBeenCalledTimes(1);

    store.dispatch({ type: 'counter/inc' });
    expect(select(store.getState())).toBe('0/1');
    expect(combiner).toHaveBeenCalledTimes(2);
  });
});
