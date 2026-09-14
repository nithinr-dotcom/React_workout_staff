import type { ChatMessage } from '../../../mocks/mockSocket';

export type { ChatMessage };

/**
 * The subset of the WebSocket / MockSocket API the component may use.
 * Events: `open`, `message` (a MessageEvent whose `data` is a JSON string) and `close` (a CloseEvent).
 */
export interface ChatSocket extends EventTarget {
  /** 0 = CONNECTING, 1 = OPEN, 3 = CLOSED */
  readyState: number;
  send(data: string): void;
  close(): void;
}

/** Called once per connection attempt. In the app: `() => new MockSocket('chat')`. */
export type SocketFactory = () => ChatSocket;

export interface ReconnectOptions {
  /** Delay before the first reconnect attempt, in ms. Default 1000. */
  baseDelay?: number;
  /** Upper bound for the delay, in ms. Default 30000. */
  maxDelay?: number;
}

export interface ChatUIProps {
  createSocket: SocketFactory;
  /** Keep only the newest N messages. Default 200. */
  maxMessages?: number;
  /** Distance from the bottom, in px, that still counts as "at the bottom". Default 80. */
  nearBottomThreshold?: number;
  /** Follow-up 1. When passed, reconnect after unexpected drops. */
  reconnect?: ReconnectOptions;
}
