# Collaborative Text Editing (OT-lite)

## Problem statement
Your team is adding real-time co-editing to a notes product. Two people can type into the same plain-text document at the same time, over a network that is slow and interleaves messages. Every participant must end up with exactly the same text, and nobody's edit may silently disappear.

Build a small operational-transform (OT) stack in the style of Google Wave / ot.js:

1. **A pure OT core.** `apply(doc, op)`, `transform(a, b, tieBreak)` and `compose(a, b)` for plain text. No I/O and no React.
2. **A client/server simulation.** `createServer` keeps the authoritative document and a revision history. `createClient` applies local edits instantly, keeps **at most one operation in flight**, buffers the rest, and transforms incoming remote operations against them. Both talk only through an injected `Network`.
3. **A React demo.** Two side-by-side textareas (Alice and Bob) connected through a server over a network with artificial latency, and a slider that controls the delay.

The API design is part of the exercise. `types.ts` is the **minimal contract** that the tests and Playground depend on. Extend it wherever you think the API should be better, but don't break it.

## Clarifying questions to ask
- Is there a central server, or is it peer-to-peer? *(A central server that orders all operations. That's why you only need TP1, not TP2.)*
- What is an operation? *(A list of `insert(pos, text)` / `delete(pos, len)` components applied left to right. Each position refers to the document as left by the previous component. `[]` is the identity.)*
- What does "transform" mean exactly? *(`transform(a, b, tie)` returns `a′`, which is `a` rebased onto a document where `b` has already been applied. TP1: `apply(apply(d, a), transform(b, a, 'right')) === apply(apply(d, b), transform(a, b, 'left'))`.)*
- Who wins when both sides insert at the same position? *(`tieBreak: 'left'` puts the first argument's text first. In the protocol, operations already in the server history win: the server and the client transform an incoming or pending client op with `'right'`.)*
- If Bob types inside a range Alice deleted concurrently, what happens to Bob's text? *(It survives. Transforming a delete around an insert that lands inside it splits the delete in two.)*
- Can the network reorder messages? *(Across different links, yes. On one link (client → server, or server → one client) delivery is FIFO, like a WebSocket.)*
- Positions: UTF-16 code units or grapheme clusters? *(UTF-16 code units, i.e. plain JS string indices. Graphemes are an edge case to discuss.)*

## Functional requirements
**OT core**
- [ ] `apply(doc, op)` applies the components in order and returns the new string. Out-of-range positions or lengths throw a `RangeError`.
- [ ] `transform(a, b, tieBreak)` returns `a′` such that TP1 holds for any two operations `a` and `b` based on the same document, for both tie-break choices.
- [ ] An insert that is concurrent with a delete is never swallowed by it. Overlapping concurrent deletes remove the shared text only once.
- [ ] `transform(a, [], tie)` behaves like `a`, and `transform([], b, tie)` behaves like the identity.
- [ ] `compose(a, b)` returns one operation equivalent to applying `a` then `b`.
- [ ] `compose` is compact. It never emits empty components (`insert ''`, `delete 0`), and it merges touching components at the boundary: consecutive typing becomes one insert, an insert followed by a delete fully inside it shrinks the insert (or removes it), and consecutive backspaces or forward deletes become one delete.

**Server**
- [ ] `createServer({ doc, network, id })` listens on `id` (default `'server'`). `join(clientId)` registers a client and returns `{ doc, revision }`.
- [ ] On `{ type: 'op', revision, op }` from a joined client, the server transforms `op` against every history entry after `revision` (with `'right'`), applies it, appends it to history, sends `{ type: 'ack', revision }` to the sender and `{ type: 'op', revision, op }` (the transformed op) to every other joined client. `revision` is the history length after applying.
- [ ] `getRevision()` is the history length. `destroy()` stops listening.

**Client**
- [ ] `createClient({ id, doc, revision, network, serverId })` starts `synchronized`.
- [ ] `applyLocal(op)` applies `op` to the local document immediately and notifies subscribers with `source: 'local'`. An empty op is ignored.
- [ ] `synchronized` → send the op with the current revision → `awaitingConfirm`.
- [ ] `awaitingConfirm` → keep the op as the buffer → `awaitingWithBuffer`. In `awaitingWithBuffer`, **compose** further ops into the buffer. Never more than one op in flight.
- [ ] On `ack`: update the revision. If there is a buffer, send it as the new pending op, otherwise become `synchronized`.
- [ ] On a remote `op`: update the revision, transform the remote op against pending then buffer (updating them too), apply it locally, and notify with `source: 'remote'`.
- [ ] After all messages are delivered, every client's document and revision equal the server's, and every client is `synchronized`.

**React demo (default export)**
- [ ] Renders two textareas labelled `Alice` and `Bob`, each backed by its own client connected to one server through `createDelayedNetwork` from `network.ts`.
- [ ] Editing a textarea turns the change into an operation (diff old value vs new value) and calls `applyLocal`. Remote changes update the other textarea.
- [ ] A range input labelled `Network delay` controls the latency in ms. It starts at `initialDelayMs` (default 300) and affects messages sent after it changes.
- [ ] Both textareas start with `initialText` (default `''`).

## Non-functional requirements
- **Correctness first:** TP1 must hold for multi-component operations, not just single inserts and deletes. Test it with randomized pairs from a seeded PRNG.
- **Determinism:** the core and the protocol never read the clock or `Math.random`. All nondeterminism lives in the injected `Network`.
- **Performance:** typing must stay responsive at 1–2 s of latency. The local document updates synchronously, and buffering keeps message count low regardless of typing speed.
- **Accessibility:** each textarea has a visible label. Each client's sync status (`synchronized` / `awaitingConfirm` / `awaitingWithBuffer`) is shown as text, and the slider shows its current value.
- **Isolation:** no shared mutable state between the server and clients except through `network`. Assume messages are serialized on the wire (`network.ts` clones them).
- **Cleanup:** unmounting the demo destroys clients, server and network timers.

## Constraints
- 120 minutes. React only, with no OT, CRDT or diff libraries.
- `network.ts` provides `createDelayedNetwork(getDelayMs)` for the demo. It's given infrastructure, not part of the exercise. Tests use their own deterministic network.
- Keep `types.ts` compatible. Add to it freely.

## Data / API contract
```ts
type Component = { type: 'insert'; pos: number; text: string } | { type: 'delete'; pos: number; len: number };
type Operation = Component[];             // applied left to right; [] is the identity
type TieBreak = 'left' | 'right';

type ClientMessage = { type: 'op'; revision: number; op: Operation };
type ServerMessage = { type: 'ack'; revision: number } | { type: 'op'; revision: number; op: Operation };
type Message = ClientMessage | ServerMessage;

interface Network {
  send(from: string, to: string, message: Message): void;               // FIFO per (from → to) link
  listen(id: string, handler: (from: string, message: Message) => void): () => void;
}

interface OTServer {
  getDoc(): string;
  getRevision(): number;
  join(clientId: string): { doc: string; revision: number };
  leave(clientId: string): void;
  destroy(): void;
}

type ClientState = 'synchronized' | 'awaitingConfirm' | 'awaitingWithBuffer';
interface OTClient {
  readonly id: string;
  getDoc(): string;
  getRevision(): number;
  getState(): ClientState;
  applyLocal(op: Operation): void;
  subscribe(listener: (change: { op: Operation; source: 'local' | 'remote' }) => void): () => void;
  destroy(): void;
}

// Exports from Solution.tsx
function apply(doc: string, op: Operation): string;
function transform(a: Operation, b: Operation, tieBreak: TieBreak): Operation;
function compose(a: Operation, b: Operation): Operation;
function createServer(options: { doc: string; network: Network; id?: string }): OTServer;
function createClient(options: { id: string; doc: string; revision: number; network: Network; serverId?: string }): OTClient;
export default function CollabDemo(props: { initialText?: string; initialDelayMs?: number }): JSX.Element;
```

## Test contract
- The core, server and client are **named exports** from `Solution.tsx`. The demo is the **default export**.
- `transform` is checked by applying results (`apply(apply(doc, b), transform(a, b, tie))`), never by comparing component shapes, except for `transform(a, [], tie)`, which must `toEqual` `a`.
- TP1 is checked on 600 seeded random pairs of 1–3 component operations over short documents, with both tie-break orders.
- `compose` is checked on 300 random pairs for equivalence, plus these exact results with `toEqual`:
  - typing `H`,`e`,`l`,`l`,`o` one insert at a time → `[insert(0, 'Hello')]`
  - `insert(0, 'Hello')` then `delete(4, 1)` → `[insert(0, 'Hell')]`
  - `insert(3, 'ab')` then `delete(3, 2)` → `[]`
  - `delete(4, 1)` then `delete(3, 1)` → `[delete(3, 2)]`
- Protocol tests use a **manual network** that queues messages per link and delivers them when the test says so (a specific link, a random link, or everything). They check:
  - after three `applyLocal` calls with no deliveries, exactly **one** message is queued from the client to the server, and the final server revision is `2`;
  - the `getState()` values and `getRevision()`;
  - the order of `subscribe` notifications (`source`);
  - convergence (docs, revisions, `synchronized`) for 60 seeds with 2 or 3 clients.
- Demo tests find `textbox` elements named `Alice` and `Bob` (they may appear after an effect) and a `slider` whose name matches `/network delay/i`. They type with `userEvent` and edit with `fireEvent.change`, then `waitFor` both values (up to 3 s with a 150 ms delay).

## Edge cases
- Two inserts at the same position, from the server's and the client's point of view.
- A delete range that contains a concurrent insert's position, and one that ends exactly at it.
- Overlapping, nested and identical concurrent deletes.
- A remote op arriving while the client has both a pending op and a buffer.
- An `ack` arriving after several remote ops, all with increasing revisions.
- A multi-component op whose later components refer to positions created by earlier ones.
- A textarea change that replaces a selection (a delete and an insert in one edit), or pasting the same text that was already there (no-op).
- Emoji and other surrogate pairs: an index between the two halves of a pair.

## Follow-ups
1. **Remote cursors.** Show each participant's caret in the other editor. Add `transformPosition(pos, op, isOwnOp)`: an insert at exactly the cursor moves it only when it's your own op, and a cursor inside a deleted range collapses to its start. Keep the local textarea's selection stable when remote ops arrive.
2. **Undo in a collaborative setting.** Ctrl+Z must undo *my* last change, not Bob's, even after Bob has edited around it. Explain inverting an operation and transforming the inverse through later ops.
3. **CRDT vs OT.** A PM asks for peer-to-peer and offline-first. Compare this design with a sequence CRDT (RGA / Yjs): metadata size, tombstones, server requirements, intention preservation, and what you'd pick for a new product.
4. **Offline edits, then reconnect.** A client goes offline for 10 minutes and keeps typing, then reconnects with an old revision. What does the client send, what does the server need to keep, and how do you stop the server's history from growing forever?
5. **Rich-text operations.** Extend operations with `retain` and formatting attributes (bold ranges) so formatting edits merge with concurrent typing. Which transform cases get harder?

## Concepts covered
Operational transform and the TP1 convergence property · tie-breaking concurrent inserts · operation composition and compaction · the ot.js client state machine (synchronized / awaiting confirm / awaiting with buffer) · server revision history · property-based testing with a seeded PRNG · simulating networks with dependency injection.

Related: ST11 Offline-first Sync (todos) · S20 Undo/Redo Drawing Canvas · ST05 Mini Redux (external stores).

## Design discussion prompts
- Walk through TP1 with an insert inside a concurrent delete. Why is this the case that forces operations to be lists?
- Why does the client keep at most one operation in flight? Compare the message count and server CPU with sending every keystroke.
- The server transforms an incoming op against all history since its revision. What is the cost for a client that's 5,000 revisions behind, and how would you bound it (snapshots, forced resync)?
- Where would you persist the history, and how would you shard documents across servers while keeping one total order per document?
- How do you test convergence in CI with confidence? Discuss seeds, shrinking a failing case to a minimal reproduction, and fuzzing against a model.
- Your demo uses a naive prefix/suffix diff of the textarea. When does that produce a surprising operation, and how would a real editor capture intent (`beforeinput`, IME composition)?
- OT (Google Docs) vs CRDT (Figma, Linear, Yjs): what are the product and infrastructure tradeoffs, and when would you migrate?
