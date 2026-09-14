import type { Book, BookApi, Page } from './types';

/** Fake book backend for the Playground. Tests inject their own `BookApi`. */

export const BOOKS: (Book & { pages: number })[] = [
  { id: 'moby', title: 'Moby-Dick', author: 'Herman Melville', pages: 427 },
  { id: 'pride', title: 'Pride and Prejudice', author: 'Jane Austen', pages: 279 },
  { id: 'frankenstein', title: 'Frankenstein', author: 'Mary Shelley', pages: 180 },
  { id: 'dracula', title: 'Dracula', author: 'Bram Stoker', pages: 418 },
  { id: 'gatsby', title: 'The Great Gatsby', author: 'F. Scott Fitzgerald', pages: 96 },
];

const WORDS =
  'the sea was calm and grey under a low sky while the crew watched the horizon for any sign of the whale that had haunted every conversation since the ship left harbour some of them whispered about omens and others laughed too loudly'.split(
    ' ',
  );

/** Deterministic filler text so a page always has the same content. */
function pageText(bookId: string, n: number) {
  let seed = n * 2654435761;
  for (const ch of bookId) seed = (seed ^ ch.charCodeAt(0)) * 16777619;
  const words: string[] = [];
  for (let i = 0; i < 160; i++) {
    seed = (seed * 1103515245 + 12345) >>> 0;
    words.push(WORDS[seed % WORDS.length]);
  }
  return `${words.join(' ')}.`;
}

export type RequestLogEntry = { id: number; label: string; status: 'pending' | 'done' | 'aborted' | 'failed' };

export interface FakeServerOptions {
  /** Latency range in ms, read on every request. */
  latency: () => [number, number];
  /** 0–1 probability that a `getPage` call fails, read on every request. */
  failRate: () => number;
  /** Called whenever a request starts or settles. */
  onLog?: (entry: RequestLogEntry) => void;
}

let nextRequestId = 1;

function request<T>(label: string, options: FakeServerOptions, signal: AbortSignal | undefined, work: () => T, canFail = false) {
  const id = nextRequestId++;
  const log = (status: RequestLogEntry['status']) => options.onLog?.({ id, label, status });
  return new Promise<T>((resolve, reject) => {
    if (signal?.aborted) {
      log('aborted');
      reject(new DOMException('The operation was aborted.', 'AbortError'));
      return;
    }
    log('pending');
    const [min, max] = options.latency();
    const timer = setTimeout(
      () => {
        signal?.removeEventListener('abort', onAbort);
        if (canFail && Math.random() < options.failRate()) {
          log('failed');
          reject(new Error(`${label} failed (simulated 500)`));
          return;
        }
        try {
          const value = work();
          log('done');
          resolve(value);
        } catch (error) {
          log('failed');
          reject(error);
        }
      },
      min + Math.random() * (max - min),
    );
    function onAbort() {
      clearTimeout(timer);
      log('aborted');
      reject(new DOMException('The operation was aborted.', 'AbortError'));
    }
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

export function createFakeBookApi(options: FakeServerOptions): BookApi {
  return {
    getBooks: ({ signal } = {}) =>
      request('getBooks()', options, signal, () => BOOKS.map(({ id, title, author }) => ({ id, title, author }))),
    getPageCount: (bookId, { signal } = {}) =>
      request(`getPageCount(${bookId})`, options, signal, () => {
        const book = BOOKS.find((b) => b.id === bookId);
        if (!book) throw new Error(`Unknown book ${bookId}`);
        return book.pages;
      }),
    getPage: (bookId, n, { signal }) =>
      request<Page>(`getPage(${bookId}, ${n})`, options, signal, () => ({ bookId, number: n, text: pageText(bookId, n) }), true),
  };
}
