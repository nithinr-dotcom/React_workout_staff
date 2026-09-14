import type { ComponentType } from 'react';

/*
 * Minimal public contract. The tests and Playground depend on everything here.
 * You may add options, fields and exports (API design is part of the exercise), but don't break these.
 */

export interface Book {
  id: string;
  title: string;
  author: string;
}

export interface Page {
  bookId: string;
  /** 1-based page number. */
  number: number;
  text: string;
}

export interface RequestOptions {
  signal?: AbortSignal;
}

/** The three backend endpoints. Every call has latency and can fail. */
export interface BookApi {
  getBooks(options?: RequestOptions): Promise<Book[]>;
  getPageCount(bookId: string, options?: RequestOptions): Promise<number>;
  /** Rejects with an `AbortError` DOMException when `signal` aborts. */
  getPage(bookId: string, pageNumber: number, options: { signal: AbortSignal }): Promise<Page>;
}

export interface BookReaderProps {
  api: BookApi;
  /** Fixed height of every page, in px. Default 600. */
  pageHeight?: number;
  /** Height of the scroll container, in px. When omitted, measure the container. Tests always pass it. */
  viewportHeight?: number;
  /** Maximum number of pages kept in the page cache. Default 20. */
  cacheSize?: number;
  /** Pages preloaded on each side of the visible pages. Default 2. */
  preload?: number;
}

export interface LruCache<K, V> {
  /** Returns the value and marks the key as most recently used. */
  get(key: K): V | undefined;
  /** Does not change recency. */
  has(key: K): boolean;
  /** Inserts or updates, marks as most recently used, and evicts the least recently used entry when over capacity. */
  set(key: K, value: V): void;
  delete(key: K): boolean;
  readonly size: number;
  /** Keys from least to most recently used. */
  keys(): K[];
}

export interface BookReaderModule {
  default: ComponentType<BookReaderProps>;
  createLruCache<K, V>(capacity: number): LruCache<K, V>;
}
