/*
 * A fake WebSocket-like connection for chat and notification tasks.
 *
 *   const socket = new MockSocket('chat', { intervalMs: 1500 });
 *   socket.addEventListener('message', (e) => console.log((e as MessageEvent).data));
 *   socket.send(JSON.stringify({ text: 'hi' }));  // echoed back as a message from "you"
 *   socket.simulateDrop();                         // fires "close" so you can test reconnect logic
 *   socket.close();
 */
import { FIRST_NAMES } from './data/generate';

export type Channel = 'chat' | 'notifications';

export interface ChatMessage {
  type: 'chat';
  id: string;
  author: string;
  text: string;
  sentAt: number;
}

export interface NotificationMessage {
  type: 'notification';
  id: string;
  kind: 'mention' | 'comment' | 'deploy' | 'alert';
  title: string;
  createdAt: number;
}

export type SocketMessage = ChatMessage | NotificationMessage;

export interface MockSocketOptions {
  intervalMs?: number;
  /** Emit a burst of N messages at once every so often (to practice batching). */
  burstEvery?: number;
  burstSize?: number;
  /** Connection delay in ms. */
  connectDelay?: number;
}

const CHAT_LINES = [
  'anyone around?', 'PR is up for review', 'lgtm 🚀', 'the build is flaky again', 'lunch?', 'deploying in 5',
  'can someone check the staging env', 'nice work on the table perf!', 'brb', 'standup moved to 10:30',
];
const NOTIFICATION_TITLES: Record<NotificationMessage['kind'], string[]> = {
  mention: ['You were mentioned in #frontend', 'Priya mentioned you in a comment'],
  comment: ['New comment on "Kanban drag and drop"', 'Ben replied to your review'],
  deploy: ['web-app deployed to production', 'Preview deployment ready'],
  alert: ['Error rate above 2% on checkout', 'LCP regression detected on /search'],
};

let seq = 0;
const nextId = () => `m${Date.now().toString(36)}${(seq++).toString(36)}`;

export class MockSocket extends EventTarget {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSED = 3;

  readyState = MockSocket.CONNECTING;
  private timer: ReturnType<typeof setInterval> | null = null;
  private ticks = 0;
  private readonly channel: Channel;
  private readonly options: Required<MockSocketOptions>;

  constructor(channel: Channel, options: MockSocketOptions = {}) {
    super();
    this.channel = channel;
    this.options = { intervalMs: 2000, burstEvery: 0, burstSize: 5, connectDelay: 300, ...options };
    setTimeout(() => this.open(), this.options.connectDelay);
  }

  private open() {
    if (this.readyState === MockSocket.CLOSED) return;
    this.readyState = MockSocket.OPEN;
    this.dispatchEvent(new Event('open'));
    this.timer = setInterval(() => this.tick(), this.options.intervalMs);
  }

  private tick() {
    this.ticks++;
    const { burstEvery, burstSize } = this.options;
    const count = burstEvery && this.ticks % burstEvery === 0 ? burstSize : 1;
    for (let i = 0; i < count; i++) this.emit(this.generate());
  }

  private generate(): SocketMessage {
    const r = Math.random();
    if (this.channel === 'chat') {
      return {
        type: 'chat',
        id: nextId(),
        author: FIRST_NAMES[Math.floor(r * FIRST_NAMES.length)],
        text: CHAT_LINES[Math.floor(Math.random() * CHAT_LINES.length)],
        sentAt: Date.now(),
      };
    }
    const kinds = Object.keys(NOTIFICATION_TITLES) as NotificationMessage['kind'][];
    const kind = kinds[Math.floor(r * kinds.length)];
    const titles = NOTIFICATION_TITLES[kind];
    return { type: 'notification', id: nextId(), kind, title: titles[Math.floor(Math.random() * titles.length)], createdAt: Date.now() };
  }

  private emit(message: SocketMessage) {
    this.dispatchEvent(new MessageEvent('message', { data: JSON.stringify(message) }));
  }

  send(data: string) {
    if (this.readyState !== MockSocket.OPEN) throw new Error('Socket is not open');
    const payload = JSON.parse(data) as { text?: string };
    if (this.channel === 'chat') {
      setTimeout(() => this.emit({ type: 'chat', id: nextId(), author: 'you', text: payload.text ?? '', sentAt: Date.now() }), 50);
    }
  }

  /** Simulate a network drop. The socket closes; create a new one to reconnect. */
  simulateDrop() {
    this.teardown();
    this.dispatchEvent(new CloseEvent('close', { code: 1006, reason: 'Connection lost', wasClean: false }));
  }

  close() {
    this.teardown();
    this.dispatchEvent(new CloseEvent('close', { code: 1000, reason: 'Closed by client', wasClean: true }));
  }

  private teardown() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.readyState = MockSocket.CLOSED;
  }
}
