# Event Emitter

## Problem statement
Implement an `EventEmitter` class, the pub/sub primitive behind Node's `events` module, DOM events and most frontend state libraries. Code subscribes to named events with `on`, and `emit` calls the subscribers synchronously with any arguments.

It looks like a ten-minute question. The follow-up questions are where senior candidates stand out: removing listeners while an emit is in progress, the same function registered twice, `once` and re-entrancy, and error events.

## Clarifying questions to ask
- If the same function is registered twice for one event, is it called twice? *(Yes, like Node. Each `on` call is its own registration.)*
- Which registration does `off(event, fn)` remove when there are duplicates? *(One registration: the most recently added one, like Node.)*
- If a listener removes another listener during `emit`, does the removed one still run in that emit? *(Yes. `emit` works on a snapshot of the listeners taken when it starts. Listeners added during an emit don't run until the next one.)*
- What is `this` inside a listener? *(The emitter instance.)*
- If a listener throws, what happens? *(The error propagates out of `emit`, and the listeners after it don't run, like Node.)*
- Async listeners? *(`emit` doesn't await them. Its return value is only whether there were listeners.)*

## Functional requirements
- [ ] `new EventEmitter()` creates an emitter. Separate instances don't share listeners.
- [ ] `on(event, listener)` registers a listener and **returns an unsubscribe function**.
  - [ ] Calling the unsubscribe function removes exactly that registration. Calling it again is a no-op.
- [ ] `emit(event, ...args)` calls each listener synchronously with `args`, in registration order, with `this` set to the emitter.
  - [ ] Returns `true` if the event had at least one listener, otherwise `false`.
  - [ ] Iterates a **snapshot**: listeners removed during the emit still run in that emit, and listeners added during the emit do not.
- [ ] Registering the same function twice means it runs twice per emit and `listenerCount` counts both.
- [ ] `off(event, listener)` removes one registration of that listener (the most recently added). Unknown events or listeners are a no-op.
- [ ] `once(event, listener)` runs the listener at most once.
  - [ ] It is removed **before** the listener runs, so an `emit` of the same event from inside the listener doesn't call it again.
  - [ ] It can be removed before it fires, either with its unsubscribe function or with `off(event, originalListener)`.
- [ ] `listenerCount(event)` returns the number of registrations. It is `0` for unknown events.
- [ ] `removeAllListeners(event)` clears one event. `removeAllListeners()` clears everything.
- [ ] Once an event has no listeners left, the emitter doesn't keep an empty entry for it.

## Non-functional requirements
- No libraries, and don't extend `EventTarget` or Node's `events`.
- **Performance:** `emit` is O(listeners for that event). Other events don't affect it.
- **Memory:** unsubscribing releases the reference to the listener so it can be garbage-collected.
- **Types:** the class satisfies `IEventEmitter` from `types.ts`.

## Constraints
- 45 minutes.
- Export the class as the named export `EventEmitter` from `Solution.ts`.

## Data / API contract
```ts
type Listener = (...args: any[]) => void;

class EventEmitter {
  on(event: string, listener: Listener): () => void;
  once(event: string, listener: Listener): () => void;
  off(event: string, listener: Listener): void;
  emit(event: string, ...args: unknown[]): boolean;
  listenerCount(event: string): number;
  removeAllListeners(event?: string): void;

  // Follow-up 3
  waitFor(event: string, options?: { signal?: AbortSignal }): Promise<unknown[]>;
}
```

## Test contract
- Tests import the class as the **named export** `EventEmitter` and create instances with `new EventEmitter()`.
- They use `vi.fn()` listeners and check call order, arguments, `this` and return values.
- Follow-up tests (`npm run test:followups -- s28`):
  - **1:** wildcard `'*'` listeners.
  - **2:** `'error'` events with no listener.
  - **3:** `waitFor` with and without an `AbortSignal`. An abort rejects with a `DOMException` named `AbortError`.

## Edge cases
- A listener that unsubscribes itself during `emit`.
- A listener that removes the **next** listener during `emit` (snapshot: the next one still runs).
- A `once` listener that emits the same event again from inside itself.
- `off` with a function that was registered with `once`.
- Event names like `'constructor'`, `'__proto__'` or `'toString'`: use a `Map` or a null-prototype object.
- `emit` with no arguments; `emit` with `undefined` arguments.

## Follow-ups
1. **Wildcard.** Listeners registered on `'*'` run on **every** emit, after the event's own listeners, and receive `(eventName, ...args)`. `emit` returns `true` if either the named or the wildcard listeners exist. Emitting `'*'` directly just calls the `'*'` listeners once, with the arguments as given.
2. **Error events.** Emitting `'error'` when there are no `'error'` listeners throws the first argument if it is an `Error`, and otherwise throws an `Error` with the message `Unhandled error event`. Wildcard listeners don't count as handling it. Why does Node do this?
3. **`waitFor(event, { signal })`.** Returns a promise that resolves with the args array of the next emit of `event`. It must not leave a listener behind once it has settled. If the signal aborts first (or is already aborted), reject with a `DOMException` named `AbortError` and remove the listener.
4. **Typed events.** Make the emitter generic, as in `new EventEmitter<{ message: [text: string, from: string]; close: [] }>()`, so that `on('message', (text, from) => …)` and `emit('message', 'hi', 'ada')` are type-checked, and a typo in an event name is a compile error.
5. **Leak detection.** Add `setMaxListeners(n)`. Warn once per event with `console.warn` when the count goes above `n`. Discuss why this catches `useEffect` subscriptions that never clean up.

## Concepts covered
Observer/pub-sub pattern · `Map` of arrays · snapshot iteration and mutation during iteration · closures for unsubscribe · `this` binding · promise-based adapters over events · AbortSignal cleanup.

Related: S19 Chat UI (socket events) · S27 Concurrency runner · S33 useFetch.
