# Chat UI

## Problem statement
Build a `ChatUI` component for a single real-time chat room. It opens a socket connection when it mounts, shows the connection status, renders incoming messages as they arrive, and lets the user send messages from a composer at the bottom.

The hard part is scrolling. When the user is reading the latest messages, new ones should scroll into view automatically. When the user has scrolled up to read history, new messages must **not** yank them back down. Instead, show a "new messages" button with an unread count that jumps to the bottom.

The socket is created through a `createSocket` prop, so the app can pass `() => new MockSocket('chat')` and the tests can pass a fake.

## Clarifying questions to ask
- Should sent messages appear immediately, or only when the server echoes them back? *(Only when echoed back. The mock server echoes every sent message with author `you`. Optimistic sending is a follow-up.)*
- How much history do we keep in memory? *(At most `maxMessages`, default 200. Older messages are dropped.)*
- What counts as "at the bottom"? *(Within `nearBottomThreshold` px, default 80, of the bottom of the scroll container.)*
- What happens when the connection drops? *(Base version: show "Disconnected". Reconnecting with backoff is follow-up 1.)*
- Can a message contain newlines? *(Yes. Shift+Enter inserts a newline, Enter sends. Render newlines as line breaks.)*
- Is there a message history endpoint to load on mount? *(No. The room starts empty.)*

## Functional requirements
- [ ] On mount, call `createSocket()` exactly once and subscribe to its `open`, `message` and `close` events.
- [ ] Show the connection status: `Connecting…` until `open`, `Connected` after `open`, `Disconnected` after `close`. If the socket is already open (`readyState === 1`) when created, show `Connected` straight away.
- [ ] Each `message` event carries a JSON string. Append messages with `type: 'chat'` to the list, in arrival order.
- [ ] Ignore events whose data is not valid JSON, is not a chat message, or has an `id` that is already in the list. None of these may crash the component.
- [ ] Each message shows its author, its text (newlines preserved) and the time from `sentAt` (for example `14:05`).
- [ ] The composer is a multi-line text field and a Send button.
  - Enter sends. Shift+Enter inserts a newline.
  - Sending calls `socket.send(JSON.stringify({ text }))` with the text trimmed, then clears the field.
  - Empty or whitespace-only text is never sent.
  - The Send button is disabled while the socket isn't open. The field stays editable, so drafts survive a disconnect.
- [ ] Keep at most `maxMessages` messages: when a new one pushes the list over the limit, drop the oldest.
- [ ] **Auto-scroll:** when a message arrives and the user was at the bottom (within `nearBottomThreshold` px), scroll the list to the bottom.
- [ ] **Unread button:** when a message arrives and the user was scrolled up, keep the scroll position and show a button such as `3 new messages ↓` with the count of messages that arrived since they scrolled away.
  - Clicking it scrolls to the bottom, hides the button and resets the count.
  - Scrolling back to the bottom by hand also hides the button and resets the count.
- [ ] On unmount, remove the event listeners and call `socket.close()`.

## Non-functional requirements
- **Accessibility:**
  - The scrollable message list has `role="log"` (which implies `aria-live="polite"`) and the accessible name `Messages`. Only new messages get announced, not the whole list.
  - The connection status is a `role="status"` element, so status changes are announced.
  - The composer's text field has a visible or visually hidden label `Message`.
  - The unread button is a real `<button>` that stays reachable with Tab.
- **Keyboard:**

  | Key | Behaviour |
  |---|---|
  | `Enter` (in the composer) | Send the message, unless it's empty |
  | `Shift` + `Enter` | Insert a newline |
  | `Enter` while an IME composition is active | Confirm the composition. Don't send. |
  | `Tab` | Move between the message list, the unread button, the field and Send |

- **Performance:** a burst of messages (the mock can send 8 at once) must not cause 8 scroll jumps or noticeable jank. Rendering 200 messages must stay smooth. Use stable keys (`message.id`).
- **UX states:** connecting, connected, disconnected, and an empty room (`No messages yet`).
- **Styling:** own messages (author `you`) are visually distinct, for example right-aligned.

## Constraints
- 75 minutes. React and CSS Modules only. No chat or virtualization libraries.
- Use `MockSocket` from `src/mocks/mockSocket.ts` in the Playground, but only talk to it through the `ChatSocket` interface, because the tests pass a fake.
- Keep the public types in `types.ts` unchanged.

## Data / API contract
```ts
interface ChatMessage { type: 'chat'; id: string; author: string; text: string; sentAt: number }

interface ChatSocket extends EventTarget {
  readyState: number;              // 0 CONNECTING, 1 OPEN, 3 CLOSED
  send(data: string): void;        // payload: JSON.stringify({ text })
  close(): void;
}
type SocketFactory = () => ChatSocket;

interface ChatUIProps {
  createSocket: SocketFactory;
  maxMessages?: number;            // default 200
  nearBottomThreshold?: number;    // default 80 (px)
  reconnect?: { baseDelay?: number; maxDelay?: number };  // follow-up 1
}
```
Default-export the component from `Solution.tsx`.

## Test contract
- `createSocket` is a `vi.fn` that returns a fake socket (an `EventTarget` with `readyState`, `send` and `close`). The tests dispatch `new Event('open')`, `new MessageEvent('message', { data })` and `new CloseEvent('close', …)` on it.
- Status: exactly one element with `role="status"`. Its text contains `Connecting`, `Connected` or `Disconnected`.
- The message list is the element with `role="log"` and accessible name `Messages`. Inside it, each message is an `<li>` (role `listitem`) whose text contains the author and the text.
- The composer is a textbox labelled `Message` and a button named `Send`.
- The unread button's accessible name contains `<count> new message`, for example `2 new messages ↓`.
- **Scrolling in jsdom:** jsdom has no layout. The tests stub `scrollHeight`, `clientHeight` and `scrollTop` on the `log` element and fire `scroll` events on it. Read those three properties from the log element itself, and scroll by **assigning `scrollTop`** on it. (`scrollTo` and `scrollIntoView` do nothing in jsdom.)
- With no stubs, all three are `0`, which counts as "at the bottom".

## Edge cases
- A burst of messages arriving in the same tick while the user is scrolled up: the count increases by the burst size.
- Messages arriving while the user is mid-scroll.
- Your own echoed message arriving while you are scrolled up. *(Base: treat it like any other message. Consider jumping to the bottom, and be ready to discuss.)*
- `maxMessages` trimming while scrolled up shifts the content. Mention how you'd keep the viewport stable.
- React StrictMode mounts effects twice in development: two sockets must not stay open.
- Calling `send` after the socket has closed throws in `MockSocket`. Guard against it.
- A very long word or URL without spaces must wrap and not overflow horizontally.

## Follow-ups
1. **Reconnect with backoff.** When `reconnect` is passed and the socket closes unexpectedly (`wasClean === false`), show `Reconnecting…` in the status and call `createSocket()` again after `baseDelay`, doubling the delay on each failed attempt up to `maxDelay`. Reset the delay after a successful `open`. Never reconnect after unmount or after a clean close.
2. **Optimistic send.** Show sent messages immediately with a "Sending…" state, reconcile them when the echo arrives, and show "Failed, retry" when sending throws. How do you match the echo to the pending message?
3. **Load older messages.** Add a `loadOlder()` prop that is called when the user scrolls to the top. Prepend the result without the viewport jumping (preserve the distance from the bottom).
4. **Batch bursts.** Coalesce messages that arrive within one animation frame into a single state update. Measure the difference with the React Profiler using the mock's `burstEvery` option.
5. **Grouping.** Group consecutive messages by the same author within 5 minutes, and add day separators ("Today", "Yesterday").

## Concepts covered
Subscribing to an external event source in `useEffect` with cleanup · refs for values that must not trigger renders (socket, "was at bottom") · `useLayoutEffect` for scroll adjustments before paint · bounded lists · `role="log"` and `role="status"` live regions · Enter vs Shift+Enter and IME composition · reconnect with exponential backoff.

Related: S03 Infinite Scroll · S10 Toast System · S32 retry with backoff · S04 Virtualized List.
