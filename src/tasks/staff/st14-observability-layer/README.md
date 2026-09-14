# Error Boundary + Observability Layer

## Problem statement
Your company runs a large React app built by many teams. Today, errors only surface when customers complain. Build the in-house **client observability SDK**, a mini Sentry or Datadog RUM, that every team can drop in.

It has four parts:
1. **A framework-agnostic client.** `createObservability({ transport, … })` buffers events and flushes them in **batches** through an injectable `transport`. A batch is sent when the buffer reaches `flushAt`, when `flushIntervalMs` has passed, or when the page is hidden. The client **dedupes** identical errors, **samples** analytics events, keeps a **breadcrumb ring buffer** that it attaches to every error, and **scrubs PII** before anything leaves the SDK.
2. **`<ObservabilityProvider client>`.** It installs global capture while mounted: `window` `error` and `unhandledrejection` events, click breadcrumbs, and a flush on `pagehide`. It removes all of it on unmount.
3. **`<ErrorBoundary fallback onReset resetKeys>`.** It renders a fallback, reports the error together with the React component stack, and recovers through `reset()` or a change to `resetKeys`.
4. **`useTrackEvent()`** for product analytics.

`types.ts` is the minimal contract that the tests and Playground depend on. The API design is part of the exercise, so extend it where you see fit, but don't break it.

## Clarifying questions to ask
- Where do events go? *(An injected `transport(events[])`. In production that would be `fetch(…, { keepalive: true })` or `navigator.sendBeacon`.)*
- Are errors sampled? *(No. Only `track` events are, at `sampleRate`. Losing errors is rarely acceptable.)*
- What counts as a duplicate error? *(Same `message` and `stack` as an error event still waiting in the unsent buffer. It increments `count` instead of adding an event. After a flush, the next occurrence is a new event.)*
- Who decides what is PII? *(The app passes `scrub`. The default `scrubPII` redacts email addresses and secret-looking keys.)*
- Must the boundary work without a provider? *(Yes. It still renders the fallback and resets; it just has nobody to report to.)*
- Does the SDK retry failed transports? *(Not in the base version, but a transport failure must never throw into the app. Retry is a follow-up.)*

## Functional requirements
- [ ] **Buffering and flushing.**
  - `track`, `captureError` and the global handlers add events to a buffer.
  - The buffer is flushed (one `transport` call with every buffered event, in order) when it reaches `flushAt` events, or no later than `flushIntervalMs` after an event was queued.
  - `flush()` sends immediately. With an empty buffer it does not call `transport`.
- [ ] **Transport failures.** A sync throw or async rejection from `transport` is swallowed. `flush()` still resolves.
- [ ] **Error events.** `captureError(error, { source?, componentStack? })` creates an `ObsErrorEvent`:
  - `message`: the error's message, or `String(value)` for non-errors
  - `stack`, when available
  - `source`: defaults to `'manual'`
  - `count: 1`
  - `breadcrumbs`: a copy of the breadcrumb buffer at capture time, oldest first
- [ ] **Dedupe.** An error with the same `message` and `stack` as an error event still in the buffer increments that event's `count` and adds nothing new.
- [ ] **Sampling.** Each `track` event is kept only if `random() < sampleRate`. Errors are never sampled.
- [ ] **Breadcrumbs.** `addBreadcrumb` adds to a ring buffer of at most `maxBreadcrumbs` entries, dropping the oldest. `timestamp` defaults to `Date.now()`.
- [ ] **Scrubbing.** `scrub(event)` runs on every event before it reaches `transport`. Returning `null` drops the event. The default is `scrubPII`.
- [ ] **`scrubPII(value)`.** Returns a deep copy and never mutates its input:
  - every email address inside any string becomes `[email]`
  - the value of any object key containing (case-insensitive) `password`, `token`, `secret`, `authorization` or `apikey` becomes `[redacted]`
  - arrays are scrubbed element-wise, and other primitives are unchanged
- [ ] **`<ObservabilityProvider client>`.** While mounted, it:
  - captures `window` `error` events (source `'window.error'`, using `event.error` when present, otherwise `event.message`)
  - captures `unhandledrejection` events (source `'unhandledrejection'`, using `event.reason`)
  - adds a `click` breadcrumb for every click in the document, with a message that includes the clicked element's text (trimmed, at most 50 characters)
  - calls `flush()` on `pagehide`, and when `document.visibilityState` becomes `hidden`

  Unmounting removes every listener.
- [ ] **`<ErrorBoundary>`.**
  - It catches render errors in its children and renders `fallback`, either a node or `({ error, reset }) => node`.
  - If a provider is above it, it reports the error with `source: 'boundary'` and the React `componentStack`.
  - `reset()` clears the error and calls `onReset`.
  - While it shows the fallback, a change to any `resetKeys` value (compared with `Object.is`) also resets it and calls `onReset`.
- [ ] **Hooks.** `useTrackEvent()` returns a stable `track(name, properties)` bound to the provider's client. `useObservability()` returns the client. Both throw a clear error outside a provider.

## Non-functional requirements
- **Accessibility:**
  - Fallback UIs should announce themselves. The Playground's fallback uses `role="alert"` and moves focus to a "Try again" button.
  - Fallbacks must not trap keyboard focus or leave focus on a removed node.
- **Performance:**
  - The SDK must never make the app slower. Keep work on the hot path (`track`, click breadcrumbs) O(1) with no synchronous serialisation.
  - Never block the main thread on the network.
  - The breadcrumb buffer and the event buffer are both bounded.
- **Reliability:**
  - The SDK's own bugs must not crash the app, and an error thrown while reporting must not cause infinite reporting loops.
  - Data is flushed on `pagehide`, which is the last reliable lifecycle event on mobile.
- **Privacy:** scrubbing happens on the client, before data leaves the device.
- **UX states:** fallback, recovering (reset), and reporting silently in the background.

## Constraints
- 100 minutes. React, TypeScript and browser APIs only. No Sentry, Datadog or web-vitals packages.
- No mock API. The Playground uses an in-memory transport and prints each batch.
- Export `createObservability`, `ObservabilityProvider`, `ErrorBoundary`, `useTrackEvent`, `useObservability` and `scrubPII` from `Solution.tsx`.

## Data / API contract
```ts
type BreadcrumbType = 'click' | 'navigation' | 'fetch' | 'custom';
interface Breadcrumb { type: BreadcrumbType; message: string; timestamp: number; data?: Record<string, unknown> }
type ErrorSource = 'boundary' | 'window.error' | 'unhandledrejection' | 'manual';

interface ObsErrorEvent {
  type: 'error';
  message: string;
  stack?: string;
  componentStack?: string;
  source: ErrorSource;
  count: number;
  breadcrumbs: Breadcrumb[];
  timestamp: number;
}
interface ObsTrackEvent { type: 'track'; name: string; properties: Record<string, unknown>; timestamp: number }
type ObsEvent = ObsErrorEvent | ObsTrackEvent;
type Transport = (events: ObsEvent[]) => void | Promise<void>;

interface ObservabilityOptions {
  transport: Transport;
  flushAt?: number;          // default 20
  flushIntervalMs?: number;  // default 5000
  sampleRate?: number;       // default 1 (track events only)
  maxBreadcrumbs?: number;   // default 30
  scrub?: (event: ObsEvent) => ObsEvent | null; // default scrubPII
  random?: () => number;     // default Math.random
}

interface ObservabilityClient {
  captureError(error: unknown, context?: { source?: ErrorSource; componentStack?: string }): void;
  track(name: string, properties?: Record<string, unknown>): void;
  addBreadcrumb(crumb: Omit<Breadcrumb, 'timestamp'> & { timestamp?: number }): void;
  flush(): Promise<void>;
}

interface ObservabilityProviderProps { client: ObservabilityClient; children: ReactNode }
interface FallbackProps { error: Error; reset: () => void }
interface ErrorBoundaryProps {
  fallback: ReactNode | ((props: FallbackProps) => ReactNode);
  onReset?: () => void;
  resetKeys?: unknown[];
  children: ReactNode;
}
type TrackFn = (name: string, properties?: Record<string, unknown>) => void;

export function createObservability(options: ObservabilityOptions): ObservabilityClient;
export function ObservabilityProvider(props: ObservabilityProviderProps): ReactNode;
export const ErrorBoundary: ComponentType<ErrorBoundaryProps>;
export function useTrackEvent(): TrackFn;
export function useObservability(): ObservabilityClient;
export function scrubPII<T>(value: T): T;
```

## Test contract
- `transport` is a `vi.fn()`. Tests read events from its calls and use a large `flushAt` or `flushIntervalMs` unless those are under test.
- The interval test uses fake timers and `vi.advanceTimersByTimeAsync`. The client is created **after** fake timers are installed, and events are queued right after creation.
- Global errors are simulated with `window.dispatchEvent(new ErrorEvent('error', { error, message }))` and `window.dispatchEvent(Object.assign(new Event('unhandledrejection'), { reason }))`, because jsdom has no `PromiseRejectionEvent`. **Attach listeners with `window.addEventListener`**, not `window.onerror`: the test runner treats an `error` event that has no listener as an uncaught exception.
- `pagehide` is simulated with `window.dispatchEvent(new Event('pagehide'))`.
- The boundary tests render a component that throws `new Error('Render exploded')`. Fallbacks in tests are `<p role="alert">Something broke: {error.message}</p>` or a `Try again` button that calls `reset`. `console.error` is silenced.
- `componentStack` on boundary events must be a non-empty string.
- Click breadcrumbs: after clicking a button whose text is `Save`, some breadcrumb has `type: 'click'` and a `message` containing `Save`.
- `scrubPII` output is compared with `toEqual`, using the exact `[email]` and `[redacted]` tokens.

## Edge cases
- Throwing non-errors: `throw 'string'`, `Promise.reject(undefined)`, or objects with no `message`.
- The error boundary itself throws inside `fallback`. What catches it?
- An error thrown **inside** `transport` or `scrub` must not be re-captured as a new error event (infinite loop).
- `flush()` is called while a previous flush is still in flight.
- `sampleRate: 0` still sends errors. `flushAt: 1` sends every event immediately.
- `resetKeys` changes while there is **no** error: nothing happens and `onReset` is not called.
- A very large burst (10,000 track calls in a loop). The buffer should flush in batches, not grow unbounded.
- Cross-origin script errors arrive as `"Script error."` with no stack. Decide how to group them.
- React Strict Mode double-mounts the provider. Listeners must not be added twice.

## Follow-ups
1. **Retry with backoff.** When `transport` fails, re-queue the batch with exponential backoff and jitter. Cap total retries and the buffer size, dropping the oldest events first. On `pagehide`, use `navigator.sendBeacon` with a 64 KB payload limit.
2. **Fetch and navigation breadcrumbs.** Wrap `window.fetch` to record `fetch` breadcrumbs (method, URL without its query string, status, duration), and patch `history.pushState` to record `navigation` crumbs. The wrappers must be removable and idempotent.
3. **Session and user context.** `client.setUser({ id })` and `setTags`. Sample per **session** (a stable hash of the session id) rather than per event, so a sampled-in session is complete. Explain why per-session sampling matters for funnels.
4. **Web vitals.** Capture LCP, CLS and INP with `PerformanceObserver` (`largest-contentful-paint`, `layout-shift`, `event`). Report them once per page view on `visibilitychange` → hidden, with the route they belong to.
5. **Error grouping.** Compute a fingerprint that normalises stacks: strip line and column numbers and hashed chunk names. Rate-limit each fingerprint to N events per minute.
6. **Suspense and async boundaries.** Show how the boundary interacts with `React.lazy` failures (a chunk load error after a deploy), and add a "reload to update" fallback for `ChunkLoadError`.

## Concepts covered
Class error boundaries (`getDerivedStateFromError` and `componentDidCatch`) · reset keys · global error and rejection capture · batching with size and time triggers · dedupe · ring buffers · sampling · deep PII scrubbing · page lifecycle (`pagehide`, `visibilitychange`) · context plus stable hook callbacks.

Related: ST12 Plugin Shell (per-slot error isolation) · ST10 Real-time Notification Feed (batching) · J23 debounce.

## Design discussion prompts
- What can't an error boundary catch? How does your SDK still see event-handler, timer and async errors, and how would you attribute them to a feature or team?
- `sendBeacon`, `fetch` with `keepalive`, or a regular `fetch`: which do you use when, and what are the size and reliability limits?
- A new release triggers 50,000 identical errors per minute across all users. Walk through what protects your ingestion backend: client dedupe, rate limiting, sampling and server-side quotas.
- How do you make minified production stacks useful? Cover source-map upload in CI, release tagging and keeping source maps private.
- Legal says no PII may leave the device. Is a regex scrubber enough? What would you add (allow-lists, typed event schemas, review gates)?
- How do you prove the SDK itself doesn't regress performance? What would you measure (bundle size, main-thread time per `track`) and how would you enforce it in CI?
- How would you roll this out to 30 teams that currently use three different logging approaches, and which dashboards and alerts would you set up first?
- Where do web vitals fit in this architecture, and how would you connect a vitals regression to the deploy that caused it?
