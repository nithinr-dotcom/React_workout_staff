import type { NotificationFeedProps, NotificationStore, NotificationStoreOptions } from './types';
import styles from './Solution.module.css';

// ⬇ Delete this line when you start. Tests for this task are skipped while it exists.
export const NOT_STARTED = true;

export function createNotificationStore(options: NotificationStoreOptions = {}): NotificationStore {
  // Your implementation here. Requirements are in README.md.
  void options;
  throw new Error('createNotificationStore: not implemented');
}

export default function NotificationFeed({
  createSocket,
  fetchMissed,
  store,
  cap = 200,
  flushIntervalMs = 250,
  backoff,
}: NotificationFeedProps) {
  // Your implementation here. Requirements are in README.md.
  void createSocket;
  void fetchMissed;
  void store;
  void cap;
  void flushIntervalMs;
  void backoff;
  return <div className={styles.root}>NotificationFeed: start coding in Solution.tsx</div>;
}
