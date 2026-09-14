# Mini Redux + useSyncExternalStore + selectors

## Problem statement
Build a small state library from scratch, then the React bindings for it.

The **core** is framework-agnostic: `createStore(reducer, preloadedState?, enhancer?)` returns a store with `getState`, `dispatch` and `subscribe`. Add `applyMiddleware` so async logic (thunks, logging) can plug in, and `combineReducers` so each feature owns a slice of state.

The **bindings** connect the store to React: a `<Provider store>` and two hooks, `useSelector(selector, equalityFn?)` and `useDispatch()`. The key requirement is precision: a component re-renders only when **the value it selected** changes, not whenever any part of the store changes. Build on `useSyncExternalStore` and make it correct under concurrent rendering.

This is a staff round, so the API you design and the way you defend it count as much as the code. `types.ts` is the minimal contract that the tests rely on. You may extend it, but don't break it.

## Clarifying questions to ask
- Must `dispatch` reject non-plain-object actions when there is no middleware? *(Yes: throw a descriptive error if the action isn't a plain object with a string `type`.)*
- What happens if a reducer calls `dispatch` or `getState`? *(Throw. Reducers must be pure.)*
- When a listener subscribes or unsubscribes during a dispatch, does it affect the notification that is already running? *(No. Each dispatch notifies a snapshot of the listeners taken when the dispatch started.)*
- Should `combineReducers` return a new root object on every action? *(No. Return the previous root object when no slice changed, so selectors and memoisation stay cheap.)*
- Does `useSelector` need a default equality function? *(Yes, `Object.is`. Callers pass `shallowEqual` or similar for derived objects.)*
- Do we need `connect()` or class component support? *(No. Hooks only.)*

## Functional requirements
- [ ] `createStore(reducer)` dispatches an internal init action so `getState()` returns the reducer's initial state.
- [ ] `createStore(reducer, preloadedState)` starts from `preloadedState` instead.
- [ ] `dispatch(action)` runs the reducer, stores the result, notifies every subscriber, and returns the action.
- [ ] `subscribe(listener)` returns an unsubscribe function. Calling it twice is harmless.
- [ ] Listeners that subscribe or unsubscribe during a notification don't change who is notified for the current dispatch. No listener is skipped.
- [ ] `dispatch` throws if the action is not a plain object with a string `type`, or if it is called from inside a reducer.
- [ ] `createStore(reducer, preloadedState, enhancer)` delegates to `enhancer(createStore)(reducer, preloadedState)`.
- [ ] `applyMiddleware(...middlewares)` returns an enhancer. Actions flow through the middlewares in the order given, then reach the reducer. The `dispatch` in the middleware API sends actions through the **whole** chain, so a thunk can dispatch another thunk.
- [ ] `combineReducers({ a, b })` initialises every slice by calling its reducer with `undefined`. It returns the **previous root object** when no slice changed.
- [ ] `<Provider store>` makes the store available to its subtree.
- [ ] `useSelector(selector, equalityFn = Object.is)` returns the selected value and re-renders only when `equalityFn(previous, next)` is false.
- [ ] `useSelector` always uses the latest `selector`, for example when it closes over props that changed.
- [ ] `useDispatch()` returns the store's `dispatch`, and its identity is stable across renders.
- [ ] Using either hook outside a `<Provider>` throws an error that says so.

## Non-functional requirements
- **Correctness under concurrency:** use `useSyncExternalStore`. No tearing: every component in a single render sees the same store snapshot.
- **Performance:**
  - Dispatching an action that no mounted selector depends on causes **zero** component re-renders.
  - A selector that returns a fresh object each call must not cause an infinite loop or a re-render when an `equalityFn` says the value is unchanged. `getSnapshot` must return a cached value.
  - `subscribe` is O(1). The cost of notification is proportional to the number of listeners.
- **Developer experience:** clear error messages when a hook is used outside a Provider, when an action is invalid, and when a reducer dispatches.
- **Accessibility:** not applicable to the library. The Playground uses normal buttons.

## Constraints
- 100 minutes. React only. No `redux`, `react-redux`, `zustand`, `use-sync-external-store` or similar packages.
- No mock API is needed. The state is local.
- Export everything listed in `types.ts` (`MiniReduxModule`) as named exports from `Solution.tsx`.

## Data / API contract
```ts
interface Action { type: string; [extra: string]: unknown }
type Reducer<S = any, A extends Action = Action> = (state: S | undefined, action: A) => S;
type Listener = () => void;
type Unsubscribe = () => void;
type Dispatch = (action: any) => any;

interface Store<S = any> {
  getState(): S;
  dispatch: Dispatch;
  subscribe(listener: Listener): Unsubscribe;
}

type StoreCreator = <S>(reducer: Reducer<S>, preloadedState?: S) => Store<S>;
type StoreEnhancer = (next: StoreCreator) => StoreCreator;
interface MiddlewareAPI<S = any> { getState(): S; dispatch: Dispatch }
type Middleware<S = any> = (api: MiddlewareAPI<S>) => (next: Dispatch) => (action: any) => any;
type ReducersMapObject<S> = { [K in keyof S]: Reducer<S[K]> };
type EqualityFn<T> = (a: T, b: T) => boolean;
interface ProviderProps { store: Store; children?: ReactNode }

interface MiniReduxModule {
  createStore<S>(reducer: Reducer<S>, preloadedState?: S, enhancer?: StoreEnhancer): Store<S>;
  applyMiddleware(...middlewares: Middleware[]): StoreEnhancer;
  combineReducers<S>(reducers: ReducersMapObject<S>): Reducer<S>;
  Provider(props: ProviderProps): ReactNode;
  useSelector<S, T>(selector: (state: S) => T, equalityFn?: EqualityFn<T>): T;
  useDispatch(): Dispatch;
  createSelector<S, I extends unknown[], R>(                        // follow-up 1
    inputSelectors: { [K in keyof I]: (state: S) => I[K] },
    combiner: (...inputs: I) => R,
  ): (state: S) => R;
}
```

## Test contract
- Named exports: `createStore`, `applyMiddleware`, `combineReducers`, `Provider`, `useSelector`, `useDispatch`, and `createSelector` for follow-up 1.
- Tests call `store.dispatch` inside `act()` and count renders with a variable that is incremented in the component body. The tests don't use StrictMode. They assert that:
  - dispatching an action that changes an **unrelated** slice leaves the render count unchanged;
  - changing the selected value re-renders the component. The tests only check that the count went up, not by how much.
- Middleware tests define their own `thunk` and `logger` middleware and check the order in which actions arrive.
- `combineReducers` must return the same root object (`toBe`) when no slice changed, and keep untouched slices by reference.
- Tests render their own components and query text such as `Count: 1`. The library renders no UI of its own.

## Edge cases
- A listener that unsubscribes itself, or another listener, during a notification.
- Calling `dispatch` inside a listener. This is allowed and triggers a nested notification.
- A selector that throws for some states, such as an item that was deleted while the component is about to unmount ("zombie child"). Think about what `useSyncExternalStore` does here.
- A `Provider` whose `store` prop changes to a different store.
- A component subscribes after a dispatch happened between its render and its effect. It must not miss that update.
- A middleware that calls `dispatch` while it is being constructed. Redux throws here. Why?

## Follow-ups
1. **createSelector.** Implement `createSelector(inputSelectors, combiner)`. It memoises on the input selector results (compared with `Object.is`) so derived data keeps a stable identity. Discuss cache size 1 versus a per-component cache.
2. **Typed hooks.** Provide a way to get `useAppSelector` and `useAppDispatch` whose types come from the root reducer, including thunk return types, without casting at call sites.
3. **Batching and priorities.** A burst of 100 dispatches from a socket. How many renders happen with React 18+ automatic batching? When would you still batch at the store level? What changes if you want `startTransition` semantics for some updates?
4. **DevTools / time travel.** Add a store enhancer that records every action and state and can replay to any index. Where does it sit in the enhancer chain relative to `applyMiddleware`?
5. **Code splitting.** Add `store.replaceReducer` plus an `injectReducer(key, reducer)` helper for lazy-loaded routes. What happens to state for slices that are not loaded yet?

## Concepts covered
The observer pattern · function composition (`compose`) · closures holding private state · `useSyncExternalStore` and tearing · snapshot caching and equality functions · stale selectors · referential stability as a performance tool · render counting as a test technique.

Related: J25 Hooks pack · ST06 Mini React Query · ST07 Hooks from scratch.

## Design discussion prompts
- Why does `useSyncExternalStore` exist? What bug (tearing) can happen with `useState` + `useEffect` subscriptions under concurrent rendering?
- Your `useSelector` is called with an inline arrow function on every render. How do you avoid re-subscribing and re-running the selector unnecessarily, while still honouring the latest selector?
- Redux notifies every subscriber on every dispatch, and each one runs its selector. At 2,000 connected components, where does the time go? How would you measure it, and what would you change: selector cost, subscription granularity, or batching?
- Compare a single global store with selectors against atomic stores (Jotai, Recoil) and signals. When would you recommend each to a product team?
- Why must reducers be pure and state immutable here? What would break if a reducer mutated a slice in place?
- How would you migrate a large app from React Context holding big objects to this store without a big-bang rewrite?
- What would your test pyramid look like for a state library used by 30 teams? What belongs in type tests?
