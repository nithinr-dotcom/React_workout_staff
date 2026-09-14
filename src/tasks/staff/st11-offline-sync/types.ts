import type { ComponentType } from 'react';
import type { Todo } from '../../../mocks/api';

export type { Todo };

/*
 * Minimal public contract. The tests and Playground depend on everything here.
 * You may add options, fields and exports, but don't break these.
 */

/**
 * pending  – a local change is waiting to reach the server (or is being retried)
 * synced   – the server has acknowledged the latest local change
 * failed   – gave up after `maxAttempts`; `retry(id)` re-queues it
 * conflict – the server had a newer version; local data was replaced by it
 */
export type SyncStatus = 'pending' | 'synced' | 'failed' | 'conflict';

export interface TodoItem extends Todo {
  status: SyncStatus;
}

export interface SyncSnapshot {
  /** In creation order (oldest first). Removed todos disappear immediately. */
  todos: readonly TodoItem[];
  online: boolean;
  /** Number of queued operations not yet acknowledged. */
  pendingCount: number;
}

export interface SyncApi {
  /** Server applies last-write-wins by `updatedAt` and returns the version it kept. */
  saveTodo(todo: Todo): Promise<Todo>;
  deleteTodo(id: string): Promise<{ ok: true }>;
  getTodos(): Promise<Todo[]>;
}

export interface NetworkStatus {
  isOnline(): boolean;
  /** Listener receives the new online state. Returns an unsubscribe function. */
  subscribe(listener: (online: boolean) => void): () => void;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface SyncEngineOptions {
  api: SyncApi;
  /** Default `window.localStorage`. All keys start with `offline-todos:`. */
  storage?: StorageLike;
  /** Default: `navigator.onLine` + `online` / `offline` window events. */
  network?: NetworkStatus;
  /** Clock for `updatedAt`. Default `Date.now`. */
  now?: () => number;
  /** Default `crypto.randomUUID()`. */
  generateId?: () => string;
  /** Total attempts per operation, including the first. Default 5. */
  maxAttempts?: number;
  /** Delay before retry number `attempt` (1-based). Default min(1000 * 2 ** (attempt - 1), 30000). */
  retryDelay?: (attempt: number) => number;
}

export interface SyncEngine {
  /** Synchronous. Same object until something changes. */
  getSnapshot(): SyncSnapshot;
  subscribe(listener: () => void): () => void;
  /** Optimistically creates a todo (`done: false`, `status: 'pending'`) and queues a save. */
  add(title: string): TodoItem;
  /** Optimistically patches a todo, bumps `updatedAt` and queues a save. */
  update(id: string, patch: Partial<Pick<Todo, 'title' | 'done'>>): void;
  /** Optimistically removes a todo and queues a delete. */
  remove(id: string): void;
  /** Re-queues a `failed` todo. */
  retry(id: string): void;
  /** Pulls server todos and merges them (local unsynced changes win). */
  load(): Promise<void>;
  /** Unsubscribes from the network, cancels timers. Persisted data stays. */
  destroy(): void;
}

export interface OfflineTodosProps {
  engine: SyncEngine;
}

export interface OfflineSyncModule {
  default: ComponentType<OfflineTodosProps>;
  createSyncEngine(options: SyncEngineOptions): SyncEngine;
}
