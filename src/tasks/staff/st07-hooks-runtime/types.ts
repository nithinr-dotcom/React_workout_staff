/*
 * Minimal public contract. The tests and Playground depend on these names and shapes.
 * You may add to it (for example useReducer, useCallback, useLayoutEffect or child components), but keep these working.
 */

/** A component is a plain function of props. It may return anything: a string, an object, a number. */
export type Component<P = any, R = unknown> = (props: P) => R;

export type SetStateAction<S> = S | ((previous: S) => S);
export type Dispatch<S> = (action: SetStateAction<S>) => void;

export type EffectCallback = () => void | (() => void);
export type DependencyList = readonly unknown[];

export interface Ref<T> {
  current: T;
}

export interface RenderHandle<P = any, R = unknown> {
  /** The output of the most recent completed render. */
  getOutput(): R;
  /** Synchronously re-renders with new props (and any queued state), runs effects, and returns the output. */
  rerender(props: P): R;
  /** Runs every effect cleanup. Later state updates for this instance are ignored. */
  unmount(): void;
}

export interface Runtime {
  /** Synchronously renders a root component, runs its effects, and returns a handle. */
  render<P, R>(component: Component<P, R>, props: P): RenderHandle<P, R>;
  useState<S>(initial: S | (() => S)): [S, Dispatch<S>];
  useEffect(effect: EffectCallback, deps?: DependencyList): void;
  useMemo<T>(factory: () => T, deps: DependencyList): T;
  useRef<T>(initial: T): Ref<T>;
  /** Resolves once every scheduled re-render (and the effects they cause) has finished. */
  flush(): Promise<void>;
}

export interface HooksRuntimeModule {
  createRuntime(): Runtime;
}
