import type {
  Dispatch,
  EqualityFn,
  Middleware,
  ProviderProps,
  Reducer,
  ReducersMapObject,
  Store,
  StoreEnhancer,
} from './types';

// ⬇ Delete this line when you start. Tests for this task are skipped while it exists.
export const NOT_STARTED = true;

// Your implementation here. Requirements are in README.md.

export function createStore<S>(reducer: Reducer<S>, preloadedState?: S, enhancer?: StoreEnhancer): Store<S> {
  void reducer;
  void preloadedState;
  void enhancer;
  throw new Error('createStore: not implemented');
}

export function applyMiddleware(...middlewares: Middleware[]): StoreEnhancer {
  void middlewares;
  throw new Error('applyMiddleware: not implemented');
}

export function combineReducers<S>(reducers: ReducersMapObject<S>): Reducer<S> {
  void reducers;
  throw new Error('combineReducers: not implemented');
}

export function Provider({ store, children }: ProviderProps) {
  void store;
  return <>{children}</>;
}

export function useSelector<S, T>(selector: (state: S) => T, equalityFn?: EqualityFn<T>): T {
  void selector;
  void equalityFn;
  throw new Error('useSelector: not implemented');
}

export function useDispatch(): Dispatch {
  throw new Error('useDispatch: not implemented');
}

/** Follow-up 1 */
export function createSelector<S, I extends unknown[], R>(
  inputSelectors: { [K in keyof I]: (state: S) => I[K] },
  combiner: (...inputs: I) => R,
): (state: S) => R {
  void inputSelectors;
  void combiner;
  throw new Error('createSelector: not implemented');
}
