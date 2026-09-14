# Paged Book Reader with page cache & preloading

## Problem statement
You're building the reading screen of an e-book app. The backend exposes three slow endpoints: `getBooks()`, `getPageCount(bookId)` and `getPage(bookId, n)`. Books have hundreds of pages, so you can't fetch them all up front, and users expect to scroll through a book smoothly or jump straight to page 312.

Build `<BookReader api />`:

1. A **book list**. Clicking a book opens it.
2. A **reader** with a scroll container sized for *all* pages, where only the pages near the viewport are rendered and fetched.
3. A **page cache** (LRU, at most 20 pages), a **preload buffer** of ±2 pages around the visible pages, and **cancellation** for pages the user scrolled past before they loaded.
4. **Per-page placeholders** for loading and error states, with retry.

Real layout isn't available in tests, so the scroll math is driven by two injected numbers: `pageHeight` (every page has the same height) and `viewportHeight` (the scroll container's height). In the browser, `viewportHeight` is optional and you measure the container. The LRU cache is also exported on its own as `createLruCache`, so its policy can be unit-tested without React.

The API design is part of the exercise. `types.ts` is the **minimal contract** that the tests and Playground depend on. Extend it wherever you think the API should be better, but don't break it.

## Clarifying questions to ask
- Do all pages have the same height? *(Yes, `pageHeight` px. Variable heights are a discussion point.)*
- Which page is "current"? *(The page at the top edge of the viewport: `floor(scrollTop / pageHeight) + 1`.)*
- Which pages are "visible"? *(Every page that overlaps `[scrollTop, scrollTop + viewportHeight)` by at least 1px. A page that starts exactly at the bottom edge is not visible.)*
- What should be fetched? *(The visible pages plus `preload` pages on each side, clamped to the book. Nothing else.)*
- What happens to a request for a page that leaves that window before it loads? *(Abort it through its `AbortSignal`. You may also debounce so it's never sent, as long as the delay is short (≤ 150 ms).)*
- What does the cache count? *(Loaded pages. Failed pages aren't cached. When a 21st page is stored, the least recently used page is dropped.)*
- Do failed pages retry automatically? *(No. Show an error placeholder with a Retry button. A failed page that leaves the window and comes back is requested again.)*
- What if the user types page 999 into a 120-page book? *(Clamp to the valid range, so it jumps to page 120.)*

## Functional requirements
**Cache**
- [ ] `createLruCache(capacity)` returns a cache with `get`, `has`, `set`, `delete`, `size` and `keys()`.
- [ ] `get` and `set` mark a key as most recently used, `has` does not. `set` evicts the least recently used entry when size would exceed `capacity`.
- [ ] `keys()` lists keys from least to most recently used.

**Book list**
- [ ] On mount, call `api.getBooks()` and show `Loading books…` until it resolves.
- [ ] Render one button per book. Its accessible name starts with the book title (the author may follow).
- [ ] If `getBooks` fails, show an error with a Retry button.

**Reader**
- [ ] Opening a book shows its title as a heading and a `Back to books` button, and calls `api.getPageCount(bookId, { signal })`.
- [ ] The scroll container has `role="region"` and `aria-label="Book pages"`. Its scrollable content height is `pageCount × pageHeight`.
- [ ] Only pages near the viewport are rendered (at least the visible ones, at most the fetch window), each as an `<article aria-label="Page N">` positioned at `(N − 1) × pageHeight`.
- [ ] A status line shows `Page N of M` for the current page, and updates as the user scrolls.
- [ ] A number input labelled `Go to page` with a `Go` button (Enter submits too) sets the container's `scrollTop` to `(N − 1) × pageHeight`, clamps `N` to `1…M`, and updates the current page **without waiting for a scroll event**.

**Fetching**
- [ ] The fetch window is the visible pages ± `preload` (default 2), clamped to `1…M`. Request every page in the window that isn't cached, in flight, or in the error state.
- [ ] Never request pages outside the window.
- [ ] When a page leaves the window while its request is in flight, abort that request. A response that arrives after its page left the window must not break anything.
- [ ] Store loaded pages in an LRU cache of `cacheSize` (default 20) pages. A cached page is rendered straight away with no request.
- [ ] Each rendered page shows its text when loaded, a placeholder containing "Loading" while loading, and on failure an error message plus a button whose name contains "Retry". Retry requests that page again.
- [ ] `Back to books` (or unmounting) aborts every in-flight request.

## Non-functional requirements
- **Performance:** scrolling must stay at 60 fps with a 1,000-page book. Render only the window, and don't re-render every page on each scroll event. Keep DOM nodes and in-flight requests bounded no matter how fast the user scrolls.
- **Network:** a fling from page 1 to page 400 must not leave hundreds of requests running. At most `visible + 2 × preload` page requests are in flight at any time.
- **Memory:** at most `cacheSize` pages are kept, per reader. Explain whether visible pages may be evicted.
- **Accessibility:** the scroll container is focusable (`tabIndex={0}`) so keyboard users can scroll it with arrows / Page Down. The status line is a polite live region. Placeholders are text, not just spinners. The Go-to-page input has a visible label.
- **UX states:** book list loading / error, page count loading, per-page loading / error. A slow page must never block the pages around it.
- **Stale data:** switching books must never show a page from the previous book.

## Constraints
- 110 minutes. React only, with no virtualization or data-fetching libraries.
- The Playground uses the fake backend in `server.ts` (adjustable latency and failure rate, with a request log). Tests inject their own `BookApi`.
- `IntersectionObserver` and layout aren't available in tests. Derive everything from `scrollTop`, `pageHeight` and `viewportHeight`.
- Keep `types.ts` compatible. Add to it freely.

## Data / API contract
```ts
interface Book { id: string; title: string; author: string }
interface Page { bookId: string; number: number; text: string }   // number is 1-based

interface BookApi {
  getBooks(options?: { signal?: AbortSignal }): Promise<Book[]>;
  getPageCount(bookId: string, options?: { signal?: AbortSignal }): Promise<number>;
  getPage(bookId: string, pageNumber: number, options: { signal: AbortSignal }): Promise<Page>; // rejects with AbortError on abort
}

interface BookReaderProps {
  api: BookApi;
  pageHeight?: number;      // default 600
  viewportHeight?: number;  // default: measure the scroll container
  cacheSize?: number;       // default 20
  preload?: number;         // default 2
}

interface LruCache<K, V> {
  get(key: K): V | undefined;
  has(key: K): boolean;
  set(key: K, value: V): void;
  delete(key: K): boolean;
  readonly size: number;
  keys(): K[];              // least → most recently used
}

// Solution.tsx
export function createLruCache<K, V>(capacity: number): LruCache<K, V>;
export default function BookReader(props: BookReaderProps): JSX.Element;
```

## Test contract
- The component is the **default export**. `createLruCache` is a **named export**.
- Tests render `<BookReader api={fake} pageHeight={100} viewportHeight={300} />` with a 120-page book, so pages 1–3 are visible at the top and pages 1–5 are fetched.
- Book list: text `Loading books…`, then buttons found with `getByRole('button', { name: /Moby-Dick/ })`.
- Reader: `heading` named with the title, a button named `Back to books`, and the exact text `Page N of 120`.
- Scrolling: the test sets `scrollTop` on `getByRole('region', { name: 'Book pages' })` and fires a `scroll` event on it.
- Jumping: the test types into `getByRole('spinbutton', { name: 'Go to page' })` and presses Enter. It types `999` too, so don't block submission with native `min`/`max` validation. After a jump it checks the region's `scrollTop`.
- Pages: `getByRole('article', { name: 'Page N' })`, checked `within` for the page text, `/loading/i`, and a button matching `/retry/i`.
- The fake `getPage` resolves immediately with the text `Text of page N`, or hangs until aborted, or rejects, depending on the test. It records each call's `AbortSignal`.
- Fetch-window assertions allow one extra page of slack at each edge (`≤ 6` at the top, `27…35` around page 30). Cancellation is checked as "every request for a skipped page has `signal.aborted === true`"; pages never requested pass trivially.
- The cache test visits pages 1, 20, 40, 60 and 80 (about 33 loaded pages), then expects page 60 to be served from cache (1 request total) and page 1 to be fetched again (2 requests total).
- Use real timers. Any debounce must be short enough for `findBy*` (≤ 150 ms).

## Edge cases
- Jumping to the last page: in a browser the scroll position gets clamped to `scrollHeight − clientHeight`, so the top page may be `M − 2`. Decide what the status line shows.
- A book shorter than the viewport, or with 0 pages.
- `getPage` resolves after the user left the book, or after they switched to another book with the same page numbers.
- A page fails, scrolls out of view, and comes back.
- A tall viewport where the window is larger than `cacheSize`.
- Rapid clicks on Retry.
- Typing `0`, a negative number, a decimal, or nothing into `Go to page`.
- `pageHeight` or `viewportHeight` changing while reading (window resize, font size change).

## Follow-ups
1. **Latency handling.** On a fast network the loading placeholder flashes for 30 ms. Show it only after 200 ms, keep the old layout stable, and add a 5 s timeout that turns into the error state. How do you test this with fake timers?
2. **Debouncing a fling.** Product says the cancel-on-scroll approach still spams the server. Don't send requests while the user is scrolling fast (velocity above a threshold), but show placeholders immediately and fetch as soon as scrolling slows.
3. **Direction-aware preloading.** Preload 4 pages in the scroll direction and 1 behind. Include the next page's images, and preload during idle time (`requestIdleCallback`).
4. **Memory cap.** Pages now contain images of very different sizes. Replace "20 pages" with a byte budget, never evict pages on screen, and keep separate caches per book so switching back is instant.
5. **Offline reading.** Add "Download for offline". Store the pages in IndexedDB with progress and resume, serve cached pages when offline, and remember the last reading position per book.

## Concepts covered
Virtualized scrolling with fixed-height slots · viewport-driven fetching · `AbortController` cancellation vs debouncing · LRU caches (`Map` insertion order) · preload buffers · per-item loading and error states · deriving render windows from injected measurements for testability.

Related: S04 Virtualized List · S03 Infinite Scroll Feed · S31 memoize & LRU cache · S33 useFetch with abort + cache · ST06 Mini React Query.

## Design discussion prompts
- Where does the page state live (component state, a ref-held store, an external cache)? What triggers a re-render when a page arrives, and how do you avoid re-rendering 7 pages when one loads?
- Walk through what happens, request by request, when the user drags the scrollbar from page 1 to page 400 in half a second.
- LRU by page count vs by bytes vs by distance from the current page: which evicts the "right" page for a reader, and why?
- How would you expose this as a reusable `useBookPages(bookId, window)` hook or a framework-agnostic page store? What would the tests look like at each layer?
- The API returns pages one at a time. Would you ask the backend team for a range endpoint (`getPages(bookId, from, to)`)? What changes in caching and cancellation?
- How would you instrument this in production: time-to-first-page, blank-page time while scrolling, cancellation rate, cache hit rate?
- Accessibility of a virtualized book: what does a screen reader user experience when pages outside the window aren't in the DOM, and how would you support "read continuously"?
