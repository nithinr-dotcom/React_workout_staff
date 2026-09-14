# Observable & Subject

## Problem statement
An `Observable` is a lazy push-based stream: nothing happens until someone subscribes, and then values are pushed to them over time until the stream completes or fails. It's the core of RxJS, and the same contract shows up in Redux `store.subscribe`, `useSyncExternalStore` and the TC39 Observable proposal.

Build a minimal version:

- `new Observable(subscriber => teardown)`: the function runs on every `subscribe` and pushes values with `subscriber.next`, `error` and `complete`. It may return a cleanup function.
- `subscribe(observerOrNext)` returns `{ unsubscribe }`.
- Three static creators: `Observable.from(arrayOrPromise)`, `Observable.interval(ms)` and `Observable.fromEvent(target, type)`.
- `pipe` with two operators, `map` and `filter`.
- A `Subject` that is both an observer and an observable, and multicasts each value to all its current subscribers.

The interviewer is checking the contract more than the code size: nothing after `complete`, cleanup always runs exactly once, and the difference between cold observables and hot subjects.

## Clarifying questions to ask
- What can `subscribe` take? *(A function, used as `next`; a partial observer object such as `{ next }` or `{ complete }`; or nothing.)*
- When does the subscribe function run? *(On each `subscribe` call, synchronously. Never at construction. Each subscriber gets its own run. That's what "cold" means.)*
- What happens after `error` or `complete`? *(The subscriber is closed. Later `next`, `error` and `complete` calls are ignored.)*
- When does teardown run? *(Exactly once: on `unsubscribe`, `complete` or `error`, whichever comes first. If the stream completes before the subscribe function has even returned its teardown, run the teardown as soon as it is returned.)*
- What if the subscribe function throws? *(Deliver the error through `error` instead of throwing from `subscribe`.)*
- What if there is no `error` handler? *(Ignore the error in the base version. RxJS reports it asynchronously; see edge cases.)*
- What does a late subscriber to a `Subject` get? *(Only values sent after it subscribed. If the subject has already completed or errored, it gets that notification immediately.)*

## Functional requirements
### Observable
- [ ] `new Observable(fn)` stores `fn` and doesn't call it.
- [ ] `subscribe(observerOrNext)` calls `fn` with a subscriber that has `next`, `error`, `complete` and `closed`, and returns an object with `unsubscribe()`.
- [ ] Accepts a `next` function, a partial observer, or nothing.
- [ ] After `complete` or `error`, no further notifications of any kind are delivered.
- [ ] `unsubscribe()` stops delivery. Calling it twice is safe.
- [ ] The value `fn` returns (a function, or an object with `unsubscribe`) is the teardown. It runs exactly once, on unsubscribe, complete or error, including when complete or error happened synchronously inside `fn`.
- [ ] A synchronous throw inside `fn` is delivered as an `error` notification.
- [ ] Each subscription is independent. Unsubscribing one never affects another.

### Creators
- [ ] `Observable.from(array)` emits each item synchronously, then completes. Any iterable works.
- [ ] `Observable.from(promise)` emits the resolved value then completes, or errors with the rejection. If unsubscribed first, nothing is delivered.
- [ ] `Observable.interval(ms)` emits `0, 1, 2, …` every `ms`. Each subscriber has its own counter and timer, and unsubscribing clears it.
- [ ] `Observable.fromEvent(target, type)` adds the listener on subscribe, emits each event object, and removes the listener on unsubscribe.

### pipe, map, filter
- [ ] `source.pipe(op1, op2, …)` applies the operators left to right, where an operator is `source => newObservable`. `pipe()` with no operators returns an equivalent observable.
- [ ] `map(project)` emits `project(value, index)`. `filter(predicate)` emits values where `predicate(value, index)` is truthy. `index` counts the values the operator received, starting at 0.
- [ ] Operators pass `error` and `complete` through, and unsubscribing from the result unsubscribes from the source.

### Subject
- [ ] `new Subject()` has `next`, `error`, `complete`, `subscribe` and `pipe`.
- [ ] `next(value)` delivers the value to every current subscriber, in subscription order.
- [ ] Unsubscribing one subscriber doesn't affect the others.
- [ ] `complete()` and `error(e)` notify every current subscriber and stop the subject. Later `next` calls are ignored, and later subscribers receive `complete` or `error` immediately.

## Non-functional requirements
- No libraries, and don't copy RxJS internals.
- **Memory:** a closed subscriber drops its teardown references. A subject drops subscribers when they unsubscribe or when it completes.
- **Safety while emitting:** a subscriber that unsubscribes itself or another subscriber during `subject.next` must not make the subject skip or repeat anyone in that emit.
- **Types:** keep the signatures from `types.ts`. `impl.Observable` satisfies `ObservableConstructor`.

## Constraints
- 75 minutes.
- Export `Observable`, `Subject`, `map` and `filter` as named exports from `Solution.ts`, plus `BehaviorSubject`, `switchMap` and `takeUntil` for the follow-ups.
- Use real `setInterval` for `interval`; tests use fake timers.

## Data / API contract
```ts
interface Observer<T> { next(value: T): void; error(error: unknown): void; complete(): void }
type ObserverOrNext<T> = Partial<Observer<T>> | ((value: T) => void);
interface Subscription { unsubscribe(): void }
interface Subscriber<T> extends Observer<T> { readonly closed: boolean }
type TeardownLogic = (() => void) | Subscription | void;
type OperatorFunction<T, R> = (source: IObservable<T>) => IObservable<R>;

interface IObservable<T> {
  subscribe(observer?: ObserverOrNext<T>): Subscription;
  pipe(...operators: OperatorFunction<any, any>[]): IObservable<any>; // typed overloads in types.ts
}

class Observable<T> implements IObservable<T> {
  constructor(subscribe: (subscriber: Subscriber<T>) => TeardownLogic);
  static from<T>(input: Iterable<T> | PromiseLike<T>): Observable<T>;
  static interval(ms: number): Observable<number>;
  static fromEvent<E extends Event = Event>(target: EventTarget, type: string): Observable<E>;
}

class Subject<T> implements IObservable<T>, Observer<T> {}

function map<T, R>(project: (value: T, index: number) => R): OperatorFunction<T, R>;
function filter<T>(predicate: (value: T, index: number) => boolean): OperatorFunction<T, T>;

// Follow-ups
class BehaviorSubject<T> extends Subject<T> { constructor(initialValue: T); getValue(): T }
function switchMap<T, R>(project: (value: T, index: number) => IObservable<R>): OperatorFunction<T, R>;
function takeUntil<T>(notifier: IObservable<unknown>): OperatorFunction<T, T>;
```

## Test contract
- Tests import `Observable`, `Subject`, `map` and `filter` as **named exports** and create instances with `new`.
- They record every `next`, `error` and `complete` call of an observer in a single ordered log, and check teardown functions with `vi.fn`.
- `Observable.from(promise)` is checked after `await new Promise((r) => setTimeout(r, 0))`.
- `interval` is tested with `vi.useFakeTimers()`; "timer cleared" means `vi.getTimerCount() === 0`.
- `fromEvent` is tested with a plain `new EventTarget()`. A spy on its `addEventListener` must not be called before subscribing.
- Follow-up tests (`npm run test:followups -- s44`):
  - **1:** `new BehaviorSubject(initial)` and `getValue()`.
  - **2:** `switchMap` over a `Subject` of queries, with inner observables that use `setTimeout` and report cancellation from their teardown.

## Edge cases
- `complete()` called inside `fn` before it returns its teardown.
- A `next` handler that calls `unsubscribe()` on its own subscription.
- `Observable.from([])` completes immediately without emitting.
- `from(promise)` unsubscribed before the promise settles: no `next`, no `complete`, and no unhandled rejection.
- A `map` projection that throws: deliver it as `error` and stop.
- `subject.next` called from inside one of its own subscribers (re-entrancy).
- An error with no `error` handler. Swallowing it hides bugs; RxJS rethrows it on a `setTimeout`. Which would you ship?

## Follow-ups
1. **BehaviorSubject.** `new BehaviorSubject(initial)` always has a current value: new subscribers receive it immediately, and `getValue()` returns it. Why is this the natural shape for app state, like the current user or theme?
2. **`switchMap` for typeahead.** Implement `switchMap(project)`. Each new outer value unsubscribes from the previous inner observable, which cancels its request, and subscribes to `project(value)`. The result completes only when the outer source has completed and the current inner one has too. Build a search box: `input$.pipe(map(e => e.target.value), filter(q => q.length > 1), switchMap(search))`. Compare it with the AbortController approach in S02.
3. **`takeUntil`.** `source.pipe(takeUntil(destroy$))` mirrors `source` until `notifier` emits, then completes and unsubscribes from both. Why is this the standard way to avoid leaks in Angular components, and what is the React equivalent?
4. **React bridge.** Write `useObservable(observable$, initialValue)` with `useSyncExternalStore`. `useSyncExternalStore` needs a synchronous `getSnapshot` and a stable `subscribe`; an `Observable` has neither. What do you have to cache, and why does a `BehaviorSubject` make it simple?
5. **Hot vs cold.** `interval` is cold: two subscribers get two timers. Write `share()` so they share one timer, starting on the first subscriber and stopping after the last unsubscribes. How does this relate to deduplicating fetches in ST06?

## Concepts covered
The observer pattern with a completion protocol · lazy cold streams vs hot multicast subjects · teardown and resource cleanup · closed-state guards · operator functions and `pipe` · adapting promises, timers and DOM events to one interface · cancellation by unsubscribing.

Related: S28 Event Emitter · S30 curry, pipe & compose · S02 Autocomplete · ST06 Mini React Query.
