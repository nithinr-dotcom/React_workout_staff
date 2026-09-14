import type { BookReaderProps, LruCache } from './types';
import styles from './Solution.module.css';

// ⬇ Delete this line when you start. Tests for this task are skipped while it exists.
export const NOT_STARTED = true;

// Your implementation here. Requirements are in README.md.

export function createLruCache<K, V>(capacity: number): LruCache<K, V> {
  void capacity;
  throw new Error('createLruCache: not implemented');
}

export default function BookReader({ api, pageHeight = 600, viewportHeight, cacheSize = 20, preload = 2 }: BookReaderProps) {
  void api;
  void pageHeight;
  void viewportHeight;
  void cacheSize;
  void preload;
  return <div className={styles.root}>BookReader: start coding in Solution.tsx</div>;
}
