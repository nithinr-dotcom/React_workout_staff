import type { ComponentType } from 'react';
import type { NotificationMessage } from '../../../mocks/mockSocket';

export type { NotificationMessage };

/*
 * Minimal public contract. The tests and Playground depend on everything here.
 * You may add options, fields and exports, but don't break these.
 */

export interface FeedItem extends NotificationMessage {
  read: boolean;
}

export interface FeedSnapshot {
  /** Newest first by `createdAt`. At most `cap` items. */
  items: readonly FeedItem[];
  unreadCount: number;
  /** Largest `createdAt` ever added (survives eviction), or `null` before the first message. */
  lastEventTime: number | null;
}

export interface NotificationStore {
  /** Synchronous. Returns the same object until something changes. */
  getSnapshot(): FeedSnapshot;
  subscribe(listener: () => void): () => void;
  /** Adds a batch. Ignores ids already in the store. Notifies at most once per call. */
  addMany(messages: NotificationMessage[]): void;
  markRead(id: string): void;
  markAllRead(): void;
}

export interface NotificationStoreOptions {
  /** Maximum number of items kept. Default 200. The oldest are evicted first. */
  cap?: number;
}

/** The subset of WebSocket / MockSocket the feed uses. */
export interface SocketLike {
  addEventListener(type: string, listener: (event: Event) => void): void;
  removeEventListener(type: string, listener: (event: Event) => void): void;
  close(): void;
}

export interface NotificationFeedProps {
  /** Default: `() => new MockSocket('notifications')`. Called again on every reconnect. */
  createSocket?: () => SocketLike;
  /** Resync: messages created after `since`. Default: resolves `[]`. */
  fetchMissed?: (since: number) => Promise<NotificationMessage[]>;
  /** Inject a store (tests, sharing with a header badge). Default: an internal store with `cap`. */
  store?: NotificationStore;
  /** Used only when `store` isn't passed. Default 200. */
  cap?: number;
  /** Incoming messages are buffered and written to the store at most this often. Default 250. */
  flushIntervalMs?: number;
  /** Delay before reconnect attempt `attempt` (0-based). Default: min(1000 * 2 ** attempt, 30000). */
  backoff?: (attempt: number) => number;
}

export interface NotificationFeedModule {
  default: ComponentType<NotificationFeedProps>;
  createNotificationStore(options?: NotificationStoreOptions): NotificationStore;
}
