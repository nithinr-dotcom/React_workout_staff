# Hooks from scratch

## Problem statement
"How do hooks actually work?" is a classic staff-level deep-dive. Answer it by building them.

Implement `createRuntime()`. It returns a tiny component runtime with `render`, `useState`, `useEffect`, `useMemo`, `useRef` and `flush`. There is no DOM and no reconciler. A component is a plain function of props that returns any value (a string, a number, an object), and the runtime keeps each rendered instance's hook state between renders.

You will have to decide:
- how hook state is stored per instance and matched to each hook call;
- how state updates are queued and batched into one re-render per tick;
- when effects and their cleanups run.

`types.ts` is the minimal contract that the tests rely on. You may add hooks (`useReducer`, `useCallback`) or child components, but keep the existing API working.

## Clarifying questions to ask
- Can components render child components? *(No. Each `render()` call creates one independent root instance. Children are a follow-up.)*
- When do state updates apply? *(Never synchronously. A setter queues the update and schedules a re-render in a **microtask**. All updates queued in the same tick produce **one** re-render.)*
- When do effects run? *(Synchronously after the component function returns, as part of the same `render()` / `rerender()` / scheduled re-render, in hook call order. First the cleanups of effects that will re-run, then those effects.)*
- What if an update doesn't change the value? *(If every queued update for an instance leaves its state `Object.is`-equal, skip the re-render.)*
- Should `rerender(props)` also apply queued state updates? *(Yes. It renders with the latest props and state.)*
- What happens to setters called after `unmount()`? *(They are ignored silently.)*

## Functional requirements
- [ ] `createRuntime()` returns an isolated runtime. Two runtimes never share state.
- [ ] `render(Component, props)` calls the component synchronously, runs its effects, and returns a handle. `handle.getOutput()` returns the latest output.
- [ ] `handle.rerender(props)` synchronously re-renders with new props, runs effects that need to run, and returns the new output.
- [ ] `handle.unmount()` runs every pending effect cleanup, once each. Later state updates for that instance are ignored.
- [ ] Each `render()` call creates a separate instance with its own hook state.
- [ ] `useState(initial)` returns `[state, setState]`:
  - `initial` may be a function, which is called only on the first render;
  - `setState` accepts a value or an updater `(prev) => next`, and updaters apply in call order;
  - the `setState` identity is stable for the instance's lifetime.
- [ ] Updates are batched. Any number of setter calls in the same tick causes at most one re-render. The output doesn't change until that re-render.
- [ ] A re-render is skipped when none of the instance's state values changed (`Object.is`).
- [ ] `useEffect(effect, deps?)`:
  - with no `deps`, it runs after every render;
  - with `[]`, it runs once after the first render;
  - otherwise it runs when any dep changed according to `Object.is`, so `NaN` equals `NaN` and a new `{}` is a change.
- [ ] A returned cleanup runs before that effect runs again, and on unmount.
- [ ] `useMemo(factory, deps)` returns the cached value until a dep changes (`Object.is`).
- [ ] `useRef(initial)` returns the same `{ current }` object on every render. Mutating it doesn't schedule a render.
- [ ] Calling any hook outside a component render throws an `Error`.
- [ ] `flush()` returns a promise that resolves once no re-render is scheduled, including re-renders caused by effects that set state during an earlier flushed render.

## Non-functional requirements
- **Complexity:** a hook call is O(1). Re-rendering one instance doesn't touch other instances.
- **Isolation:** no module-level mutable state. Everything lives inside the runtime returned by `createRuntime()`.
- **Error safety:** if a component throws during a render, the runtime is not left in a "currently rendering" state. Hooks called afterwards outside render still throw.
- **Diagnostics:** errors say which rule was broken, for example "hooks can only be called inside a component render".
- **Accessibility:** not applicable. The Playground visualises the runtime with normal buttons and text.

## Constraints
- 90 minutes. Plain TypeScript, no React imports in `Solution.ts`.
- No mock API is needed.
- Export `createRuntime` from `Solution.ts`.

## Data / API contract
```ts
type Component<P = any, R = unknown> = (props: P) => R;
type SetStateAction<S> = S | ((previous: S) => S);
type Dispatch<S> = (action: SetStateAction<S>) => void;
type EffectCallback = () => void | (() => void);
type DependencyList = readonly unknown[];
interface Ref<T> { current: T }

interface RenderHandle<P = any, R = unknown> {
  getOutput(): R;
  rerender(props: P): R;
  unmount(): void;
}

interface Runtime {
  render<P, R>(component: Component<P, R>, props: P): RenderHandle<P, R>;
  useState<S>(initial: S | (() => S)): [S, Dispatch<S>];
  useEffect(effect: EffectCallback, deps?: DependencyList): void;
  useMemo<T>(factory: () => T, deps: DependencyList): T;
  useRef<T>(initial: T): Ref<T>;
  flush(): Promise<void>;
}

interface HooksRuntimeModule { createRuntime(): Runtime }
```

## Test contract
- Tests call `impl.createRuntime()` and use the hooks from that runtime (`rt.useState`) inside plain function components.
- State updates are awaited with `await rt.flush()`. Tests check that `getOutput()` has **not** changed immediately after a setter call.
- Render counts are checked exactly in three places:
  - three updates in one tick cause exactly one extra render;
  - an update to the same value causes no render;
  - mutating a ref causes no render.
- The effect order test expects exactly `['render 1', 'effect 1', 'render 1', 'render 2', 'cleanup 1', 'effect 2']`. Here `render N` is logged in the component body after `useEffect` is called.
- Follow-up 1: `rerender` throws an `Error` whose message contains "hook" when the number of hook calls changes.

## Edge cases
- A setter called inside an effect during the initial `render()`: it must schedule, not recurse synchronously.
- An effect that sets state unconditionally will loop forever. Should `flush()` detect this (for example after 50 nested renders)?
- A setter called during render (not in an effect). Decide: throw, or re-render immediately like React does.
- A component that throws on a re-render. What happens to the previous output and to pending effects?
- `deps` arrays whose length changes between renders.
- `unmount()` called twice.

## Follow-ups
1. **Rules-of-hooks detection.** Throw a descriptive error when a render calls a different number of hooks than the previous render. Bonus: detect a different hook *type* at the same index.
2. **Child components.** Support `h(Child, props)` in the output so components can nest. Each child instance keeps its own hooks, keyed by position and an optional `key`. Unmount children that disappear.
3. **useReducer and useCallback.** Implement `useReducer`. Then express `useState` in terms of it, and `useCallback` in terms of `useMemo`.
4. **Layout vs passive effects.** Add `useLayoutEffect`, which runs synchronously, and make `useEffect` run in a later macrotask. What observable ordering differences does this create?
5. **Priorities.** Add `startTransition(fn)`: updates inside it are applied in a later, interruptible pass, and urgent updates can go first.

## Concepts covered
Hook state as an ordered list per instance · closures capturing the "current instance" · microtask scheduling and batching · `Object.is` dependency comparison · cleanup-before-rerun semantics · why hooks can't be called conditionally.

Related: J25 Hooks pack · ST05 Mini Redux · ST06 Mini React Query.

## Design discussion prompts
- Why does React identify hooks by call order instead of by name or key? What would an API with keyed hooks look like, and what would it cost?
- Why does React batch updates? What changed between React 17 (batching only inside event handlers) and React 18 (automatic batching)?
- Why do effects run after commit and not during render? What goes wrong if you run them during render?
- Explain stale closures in terms of your implementation: which closure captured which value, and which render did it come from?
- How does your design change once components can have children? Where would a fiber tree or work loop come in?
- How would you test a scheduler deterministically? What does `act()` in React Testing Library actually do?
- If you were building a signals-based runtime instead, which of these hooks would disappear, and why?
