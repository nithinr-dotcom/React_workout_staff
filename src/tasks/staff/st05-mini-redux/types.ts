import type { ReactNode } from 'react';

/*
 * Minimal public contract. The tests and Playground depend on these names and shapes.
 * You may extend or tighten the types (for example, typed thunks or a typed `useAppSelector`),
 * as long as the existing signatures keep working.
 */

export interface Action {
  type: string;
  [extra: string]: unknown;
}

/** Called with `undefined` state during initialisation. Must return the initial state then. */
export type Reducer<S = any, A extends Action = Action> = (state: S | undefined, action: A) => S;

export type Listener = () => void;
export type Unsubscribe = () => void;

/** Loosely typed so middleware can accept non-action values (for example thunks). */
export type Dispatch = (action: any) => any;

export interface Store<S = any> {
  getState(): S;
  dispatch: Dispatch;
  subscribe(listener: Listener): Unsubscribe;
}

export type StoreCreator = <S>(reducer: Reducer<S>, preloadedState?: S) => Store<S>;
export type StoreEnhancer = (next: StoreCreator) => StoreCreator;

export interface MiddlewareAPI<S = any> {
  getState(): S;
  /** Dispatches through the whole middleware chain. */
  dispatch: Dispatch;
}

export type Middleware<S = any> = (api: MiddlewareAPI<S>) => (next: Dispatch) => (action: any) => any;

export type ReducersMapObject<S> = { [K in keyof S]: Reducer<S[K]> };

export type EqualityFn<T> = (a: T, b: T) => boolean;

export interface ProviderProps {
  store: Store;
  children?: ReactNode;
}

export interface MiniReduxModule {
  createStore<S>(reducer: Reducer<S>, preloadedState?: S, enhancer?: StoreEnhancer): Store<S>;
  applyMiddleware(...middlewares: Middleware[]): StoreEnhancer;
  combineReducers<S>(reducers: ReducersMapObject<S>): Reducer<S>;
  Provider(props: ProviderProps): ReactNode;
  useSelector<S, T>(selector: (state: S) => T, equalityFn?: EqualityFn<T>): T;
  useDispatch(): Dispatch;
  /** Follow-up 1 */
  createSelector<S, I extends unknown[], R>(
    inputSelectors: { [K in keyof I]: (state: S) => I[K] },
    combiner: (...inputs: I) => R,
  ): (state: S) => R;
}
