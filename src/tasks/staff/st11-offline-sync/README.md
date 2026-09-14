# Offline-first Sync (todos)

## Problem statement
Field workers use your todo app on flaky mobile connections. Every change must feel instant, survive a page reload while offline, and reach the server once connectivity returns, without duplicating work or silently throwing away someone else's newer edit.

Build a **local-first sync engine** and a thin UI on top of it:
1. **`createSyncEngine(options)`:** a framework-agnostic engine. It applies writes optimistically, records them in a **persisted outbox**, replays the outbox in order when online, retries with backoff, and resolves conflicts **last-write-wins by `updatedAt`**. When the server wins, the user is told.
2. **`<OfflineTodos engine>`:** the UI. It adds, toggles, renames and deletes todos, shows each todo's sync status and whether the app is online, and lets the user retry failed items.

Every dependency (API, storage, network, clock, ids, retry policy) is injected, so the engine is deterministic under test.

The API design is part of the exercise. `types.ts` is the **minimal contract** that the tests and Playground depend on. Extend it, but don't break it.

## Clarifying questions to ask
- Which side resolves conflicts? *(The server applies last-write-wins by `updatedAt` and returns the version it kept. If that isn't the version the client sent, the server won.)*
- What should the user see when the server wins? *(The server's version replaces the local one and the todo is marked `conflict`, shown as `Server version kept`. Editing it again makes it `pending`.)*
- Should operations be sent in parallel? *(No. Replay the outbox one operation at a time, in order.)*
- Can queued operations be merged? *(Yes. Coalescing several saves of the same todo is a welcome optimisation, but it must never reorder a create after its delete or lose the latest values.)*
- What happens after `maxAttempts` failures? *(That operation is marked `failed` and taken out of the replay loop so it doesn't block the queue forever. `retry(id)` re-queues it.)*
- Is `navigator.onLine` trustworthy? *(Not fully: `true` doesn't mean the server is reachable. Use it as a hint, and treat a failed request as a retryable error.)*

## Functional requirements
**Engine**
- [ ] `add(title)` immediately adds `{ id, title, done: false, updatedAt: now(), status: 'pending' }` to the snapshot, queues a save, and returns the item.
- [ ] `update(id, patch)` immediately applies the patch, sets `updatedAt = now()`, sets status to `pending`, and queues a save.
- [ ] `remove(id)` immediately removes the todo from the snapshot and queues a delete.
- [ ] The outbox **and** the local todos are persisted to `storage` under keys starting with `offline-todos:`. A new engine created with the same storage restores both, with statuses intact, and resumes syncing.
- [ ] While offline (`network.isOnline() === false`), no API calls are made. Changes stay `pending`.
- [ ] When online, and whenever the network goes back online, replay the outbox **one operation at a time in order**. Start right away, without artificial delays.
- [ ] A failed operation is retried after `retryDelay(attempt)` ms, where `attempt` is 1 for the first retry. After `maxAttempts` total attempts (default 5), the todo becomes `failed` and the queue moves on.
- [ ] `retry(id)` re-queues a `failed` todo's latest local version.
- [ ] A successful save makes the todo `synced`, unless a newer local edit is still queued, in which case it stays `pending`.
- [ ] **Conflict:** if `saveTodo` resolves with a version whose `updatedAt` is newer than the one sent, replace the local todo with the server version and mark it `conflict`.
- [ ] `load()` fetches `getTodos()` and merges the result: todos with unsynced local changes keep their local version, and everything else takes the server version as `synced`.
- [ ] `getSnapshot()` returns `{ todos, online, pendingCount }` and the **same object** until something changes. `subscribe` notifies on every change.
- [ ] `destroy()` unsubscribes from the network and cancels retry timers. Persisted data stays.

**UI (`OfflineTodos`)**
- [ ] A text input labelled `New todo` and an `Add` button (Enter submits). Blank titles are ignored.
- [ ] A list of todos. Each item shows its title, a checkbox labelled with the title to toggle `done`, a `Delete` button, and a status label: `Pending sync`, `Synced`, `Sync failed` or `Server version kept`.
- [ ] Failed items show a `Retry` button.
- [ ] A connection indicator: `Online` or `Offline`, plus the number of queued changes.

## Non-functional requirements
- **Latency:** every local action updates the UI in the same frame (no awaiting the network before re-rendering).
- **Durability:** a reload at any moment loses no acknowledged-locally change. Write to storage *before* sending the request.
- **Idempotency:** replaying a save twice (a crash after the send but before the ack) must be harmless. Explain why this API is idempotent and which operations generally aren't.
- **Accessibility:**
  - Status changes are announced politely: a `role="status"` region for connection changes and sync failures, not for every successful sync.
  - Status is conveyed by text, not only colour.
  - Deleting an item moves focus to a sensible neighbour.

  | Key | Behaviour |
  |---|---|
  | `Enter` in `New todo` | Adds the todo |
  | `Space` on a checkbox | Toggles done |
  | `Tab` | Reaches each item's checkbox, `Delete` and `Retry` controls in order |
- **Storage limits:** handle `setItem` throwing (quota exceeded, private mode) without crashing. Keep working in memory and surface a warning.

## Constraints
- 110 minutes. React only, with no sync, state or storage libraries.
- Use `saveTodo`, `deleteTodo` and `getTodos` from `src/mocks/api.ts`. `saveTodo` already implements last-write-wins by `updatedAt`. In the Playground, set `failRate` and toggle airplane mode.
- Tests inject a `vi.fn` API, an in-memory storage and a fake network.
- Keep `types.ts` compatible.

## Data / API contract
```ts
// from src/mocks/api.ts
interface Todo { id: string; title: string; done: boolean; updatedAt: number }

type SyncStatus = 'pending' | 'synced' | 'failed' | 'conflict';
interface TodoItem extends Todo { status: SyncStatus }
interface SyncSnapshot { todos: readonly TodoItem[]; online: boolean; pendingCount: number }

interface SyncApi {
  saveTodo(todo: Todo): Promise<Todo>;         // returns the version the server kept
  deleteTodo(id: string): Promise<{ ok: true }>;
  getTodos(): Promise<Todo[]>;
}
interface NetworkStatus { isOnline(): boolean; subscribe(listener: (online: boolean) => void): () => void }
interface StorageLike { getItem(key: string): string | null; setItem(key: string, value: string): void; removeItem(key: string): void }

interface SyncEngineOptions {
  api: SyncApi;
  storage?: StorageLike;                        // default localStorage; keys start with "offline-todos:"
  network?: NetworkStatus;                      // default navigator.onLine + online/offline events
  now?: () => number;                           // default Date.now
  generateId?: () => string;                    // default crypto.randomUUID()
  maxAttempts?: number;                         // default 5 (total, including the first)
  retryDelay?: (attempt: number) => number;     // attempt is 1-based; default min(1000 * 2 ** (attempt - 1), 30000)
}

interface SyncEngine {
  getSnapshot(): SyncSnapshot;
  subscribe(listener: () => void): () => void;
  add(title: string): TodoItem;
  update(id: string, patch: Partial<Pick<Todo, 'title' | 'done'>>): void;
  remove(id: string): void;
  retry(id: string): void;
  load(): Promise<void>;
  destroy(): void;
}

export function createSyncEngine(options: SyncEngineOptions): SyncEngine;          // named export
export default function OfflineTodos(props: { engine: SyncEngine }): JSX.Element;
```

## Test contract
- Engine tests use `createSyncEngine` with `api` methods as `vi.fn`s (by default `saveTodo` resolves with the todo it was given), an in-memory `StorageLike`, a fake `NetworkStatus` whose state the test flips, and injected `now` / `generateId`.
- Tests read state only through `getSnapshot()` and check API calls. They never inspect the storage format beyond the engine restoring from it.
- **Order:** after several offline changes, going online calls `saveTodo` for the todos in the order they were first changed, and the last save of each todo carries its latest values.
- **Retries** use `vi.useFakeTimers()`, `maxAttempts: 3`, `retryDelay: () => 1000` and `vi.advanceTimersByTimeAsync`. There are exactly 3 calls, then `status: 'failed'`, and no more calls afterwards.
- **Conflict:** `saveTodo` resolves with `{ ...sent, title: 'Edited elsewhere', updatedAt: sent.updatedAt + 1000 }`, so the snapshot has that title and `status: 'conflict'`.
- **UI:** `getByRole('textbox', { name: 'New todo' })`, `getByRole('button', { name: 'Add' })`, a `listitem` containing the title and the status text `Pending sync`, then `Synced`.

## Edge cases
- Add, then delete a todo while offline, before it ever reached the server.
- Edit the same todo five times offline. Coalescing is fine, but the final server state must be the last edit.
- The network flaps (online → offline → online) while a request is in flight. Don't double-start the replay loop.
- Two tabs share one `localStorage` outbox. What happens? (Discuss it. It isn't required.)
- Storage contains corrupt JSON from an older app version.
- `saveTodo` succeeds but the response is lost (a timeout). The replay re-sends it.
- The clock on the device is wrong by hours. How does that interact with last-write-wins?
- A `conflict` todo is edited again, making it `pending` with a fresh `updatedAt`.

## Follow-ups
1. **Multi-tab coordination.** Only one tab replays the outbox (Web Locks or `BroadcastChannel` leader election). Other tabs see status updates live.
2. **Field-level merge.** Instead of whole-document last-write-wins, merge `title` and `done` independently using per-field timestamps. Show a case where whole-document LWW loses data and your merge doesn't.
3. **Background sync.** Move replay into a Service Worker with the Background Sync API. What moves out of the page, and what stays?
4. **Storage upgrade.** Move from `localStorage` to IndexedDB with a versioned schema migration that doesn't lose a pending outbox.
5. **CRDTs vs OT.** Discuss how collaborative rich-text editing (e.g. Yjs, Automerge, or operational transforms) changes the design. When is LWW good enough?

## Concepts covered
Local-first architecture · optimistic UI · durable outbox / write-ahead log · ordered replay · exponential backoff · idempotency · last-write-wins and its failure modes · online/offline detection · dependency injection · `useSyncExternalStore`.

Related: ST10 Real-time Notification Feed (reconnect) · ST06 Mini React Query (mutations) · ST05 Mini Redux (external stores).

## Design discussion prompts
- Walk through a crash at each point of a save: before persisting, after persisting but before sending, after sending but before the ack. What happens in each case?
- Why replay sequentially? What would you gain and lose with per-todo parallel queues?
- Last-write-wins relies on client clocks. What goes wrong, and what would you use instead (server-assigned versions, hybrid logical clocks)?
- How do you tell the user their change was overwritten without being noisy? Who owns that UX decision?
- A failed operation can block everything behind it. How do you decide between head-of-line blocking and skipping?
- How would you test this end to end, including real reloads and real offline mode?
- The team wants to reuse this engine for comments, attachments and settings. What would you generalise, and what would you deliberately not?
- What metrics tell you sync is healthy in the field (outbox depth, age of oldest pending op, conflict rate)?
