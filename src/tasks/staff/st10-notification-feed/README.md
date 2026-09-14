# Real-time Notification Feed

## Problem statement
Build the notification panel for a large SaaS product. Notifications arrive over a WebSocket. Most of the time that's one every few seconds, but during an incident or a big deploy **dozens arrive in the same tick**. Today's implementation calls `setState` once per message, freezes the tab during bursts, silently loses everything sent while the laptop was asleep, and grows memory without limit in tabs that stay open for days.

Design and build:
1. **`createNotificationStore({ cap })`:** a framework-agnostic, normalized, bounded store with dedupe and read state.
2. **`<NotificationFeed>`:** connects through an injectable socket factory. It batches bursts, shows the feed and the unread count, reconnects with exponential backoff, and **resyncs** the messages it missed while disconnected.

The API design is part of the exercise. `types.ts` is the **minimal contract** that the tests and Playground depend on. Extend it if you like, but don't break it.

## Clarifying questions to ask
- Is the server's `id` globally unique and stable across resends? *(Yes. Use it for dedupe.)*
- Can messages arrive out of order? *(Yes, especially after a resync. Always display newest first by `createdAt`.)*
- Is read state synced to the server? *(Not in the base version. It's local only. See the follow-ups.)*
- How many notifications should an open tab keep? *(The latest `cap`, 200 by default. Older ones are evicted.)*
- Does the server replay missed messages on reconnect? *(No. The client must call `fetchMissed(lastEventTime)` once the new socket is open.)*
- Should the unread count be announced to screen readers? *(Yes, politely, and throttled so a burst doesn't produce 40 announcements.)*

## Functional requirements
**Store**
- [ ] `getSnapshot()` returns `{ items, unreadCount, lastEventTime }`, with `items` sorted newest first by `createdAt`. It returns the **same object** until something changes.
- [ ] `addMany(messages)` adds new items as unread and **ignores ids already in the store**. Re-delivering a message never resets its read state.
- [ ] The store keeps at most `cap` items (default 200) and evicts the oldest by `createdAt`.
- [ ] `lastEventTime` is the largest `createdAt` ever added, even if that item has since been evicted.
- [ ] `markRead(id)` and `markAllRead()` update items and `unreadCount`.
- [ ] Subscribers are notified at most once per `addMany` / `markRead` / `markAllRead` call, and not at all when nothing changed.

**Feed component**
- [ ] On mount, call `createSocket()` and listen for `open`, `message` and `close`. Each `message` event's `data` is a JSON `NotificationMessage`. Ignore malformed JSON and anything whose `type` isn't `'notification'`.
- [ ] **Batching:** buffer incoming messages and write them to the store with **one `addMany` call per flush**. Flush at most every `flushIntervalMs` (default 250). A burst of messages in the same tick must produce a single store write.
- [ ] Render the items in a list labelled `Notifications`, newest first. Each item shows its `title` and a relative time, and has a `Mark as read` button while unread.
- [ ] Always show the unread count as `{n} unread`, including `0 unread`.
- [ ] A `Mark all as read` button.
- [ ] With no items, show `No notifications`.
- [ ] **Reconnect:** when the socket closes unexpectedly, show `Reconnecting…` and call `createSocket()` again after `backoff(attempt)` ms. The default backoff is 1s, 2s, 4s, 8s… capped at 30s. `attempt` resets to 0 after a successful `open`.
- [ ] **Resync:** when a *reconnected* socket fires `open` and `lastEventTime` isn't `null`, call `fetchMissed(lastEventTime)` and add the results through the same store path. Dedupe covers any overlap.
- [ ] **Cleanup:** on unmount, remove listeners, close the socket, cancel pending flushes and reconnect timers, and never reconnect afterwards.
- [ ] If a `store` prop is passed, use it for all reads and writes.

## Non-functional requirements
- **Performance:** a burst of 100 messages in one tick causes one store write and one React commit. Rendering stays smooth with `cap` items (memoized rows; the list re-renders only rows that changed).
- **Memory:** it's bounded by `cap`, including any structure used for dedupe. Explain what happens to dedupe for ids that have already been evicted.
- **Accessibility:**
  - The list is a `<ul aria-label="Notifications">`, and each notification is a list item.
  - A visually hidden `role="status"` (polite) region announces something like `3 new notifications`, **at most once every 5 seconds**. It combines everything that arrived in that window.
  - Buttons have visible focus rings. Marking an item read must not move focus unexpectedly.

  | Key | Behaviour |
  |---|---|
  | `Tab` | Moves through `Mark all as read`, then each item's `Mark as read` button |
  | `Enter` / `Space` | Activates the focused button |
- **UX states:** connecting, live, reconnecting (with the next attempt time), resyncing, and empty.
- **Resilience:** a failed `fetchMissed` doesn't tear down the connection. Log it and carry on.

## Constraints
- 110 minutes. React only, with no state or socket libraries.
- The default socket is `new MockSocket('notifications')` from `src/mocks/mockSocket.ts`. Try `burstEvery` / `burstSize` and `simulateDrop()` in the Playground.
- There is no `fetchMissed` endpoint in the mock API, so the Playground fakes one.
- Keep `types.ts` compatible.

## Data / API contract
```ts
// from src/mocks/mockSocket.ts
interface NotificationMessage {
  type: 'notification'; id: string; kind: 'mention' | 'comment' | 'deploy' | 'alert'; title: string; createdAt: number;
}

interface FeedItem extends NotificationMessage { read: boolean }
interface FeedSnapshot { items: readonly FeedItem[]; unreadCount: number; lastEventTime: number | null }

interface NotificationStore {
  getSnapshot(): FeedSnapshot;
  subscribe(listener: () => void): () => void;
  addMany(messages: NotificationMessage[]): void;
  markRead(id: string): void;
  markAllRead(): void;
}
function createNotificationStore(options?: { cap?: number }): NotificationStore; // named export

interface SocketLike {
  addEventListener(type: string, listener: (event: Event) => void): void;
  removeEventListener(type: string, listener: (event: Event) => void): void;
  close(): void;
}

interface NotificationFeedProps {
  createSocket?: () => SocketLike;                                   // default: new MockSocket('notifications')
  fetchMissed?: (since: number) => Promise<NotificationMessage[]>;   // default: async () => []
  store?: NotificationStore;
  cap?: number;                                                      // default 200 (when no store)
  flushIntervalMs?: number;                                          // default 250
  backoff?: (attempt: number) => number;                             // default min(1000 * 2 ** attempt, 30000)
}
export default function NotificationFeed(props: NotificationFeedProps): JSX.Element;
```

## Test contract
- Component tests pass a fake socket: an `EventTarget` that dispatches `open`, `message` (a `MessageEvent` whose `data` is a JSON string) and `close` (a plain `Event`). Its `close()` is a `vi.fn` that also dispatches `close`.
- Tests use fake timers and advance time by `flushIntervalMs` + a little before asserting new items.
- `getByRole('list', { name: 'Notifications' })`, with `listitem`s in newest-first order containing each `title`.
- The text `{n} unread` (e.g. `2 unread`, `0 unread`).
- `getByRole('button', { name: 'Mark all as read' })`, and inside a list item, `getByRole('button', { name: 'Mark as read' })`.
- The text `No notifications` when empty.
- **Batching:** with an injected `store`, `vi.spyOn(store, 'addMany')` sees at most 2 calls for 20 messages dispatched in the same tick.
- **Reconnect:** with `backoff={() => 1000}`, `createSocket` is called a second time after ~1000 ms (and not after 500 ms). When the new socket fires `open`, `fetchMissed` is called with the largest `createdAt` seen so far, and its results appear after a flush.
- After unmount, the socket's `close` has been called and `createSocket` is never called again.

## Edge cases
- Duplicate delivery: the same id in a live message and in the resync response.
- A burst that arrives while the reconnect timer is pending, from a socket that's already closed.
- `close` fired by your own cleanup must not trigger a reconnect.
- The socket drops before `open` ever fires. Backoff should still grow.
- Malformed JSON, or a `chat` message on the wrong channel.
- `cap` smaller than a single burst.
- A message with `createdAt` older than every item in a full store is evicted immediately. It must not flash in.
- A tab that stays in the background for hours: timers are throttled by the browser, so bursts pile up.

## Follow-ups
1. **Server-synced read state.** `markRead` becomes an optimistic mutation with rollback. Read receipts from other tabs and devices arrive over the socket.
2. **Cross-tab coordination.** Only one tab holds the socket (leader election via `BroadcastChannel` / Web Locks). The others receive updates from the leader, and unread counts stay consistent across tabs.
3. **Grouping.** Collapse similar notifications ("Ben and 4 others commented on…") without breaking dedupe or read state.
4. **Virtualized history.** Scroll back through thousands of older notifications with cursor pagination and windowed rendering, while live items keep arriving at the top without shifting the scroll position.
5. **Heartbeats.** Detect half-open connections: no message or ping for 30s means reconnect, even without a `close` event.

## Concepts covered
Normalized, bounded client state · external store + `useSyncExternalStore` · batching high-frequency events · exponential backoff with jitter · resync by high-water mark · idempotent dedupe · effect cleanup for long-lived connections · throttled `aria-live` announcements.

Related: ST05 Mini Redux (external stores) · ST06 Mini React Query (cache + GC) · ST11 Offline-first Sync.

## Design discussion prompts
- Why buffer outside React instead of relying on React 18+ automatic batching? What does automatic batching *not* save you from here?
- Timer flush vs `requestAnimationFrame` flush vs `startTransition`: what does each do to latency, background tabs and dropped frames?
- The resync is based on a `lastEventTime` high-water mark. Where does that break (clock skew, same-millisecond events, out-of-order delivery), and what would you ask the backend team for instead?
- What does backoff jitter solve? Describe the thundering-herd scenario after a regional outage with 2M connected clients.
- How do you keep dedupe memory bounded while still catching duplicates of ids that were evicted?
- Where does this store live if the header bell, the panel and a toast system all need it? Who owns the socket connection?
- How would you test reconnect and resync end to end without real sockets or real time?
- What metrics would you put on a dashboard to know this feed is healthy in production?
