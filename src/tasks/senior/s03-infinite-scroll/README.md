# Infinite Scroll Feed

## Problem statement
Build an `InfiniteFeed` component that shows a social-media style list of posts and loads the next page automatically as the user scrolls near the bottom. There are no "Next page" buttons.

The backend uses **cursor pagination**: each response contains a page of posts and a `nextCursor` to pass to the next request, or `null` when there is nothing more. The network is slow and unreliable. Your feed must never fire the same request twice at once, must never render the same post twice, must stop when the data runs out, and must let the user recover from a failed request.

By default, load posts with `getFeed` from the mock API. The data source is injectable through the `fetchPage` prop.

## Clarifying questions to ask
- How do we detect "near the bottom"? *(Use `IntersectionObserver` on a sentinel element after the last post. Don't use scroll event listeners.)*
- What is the page size? *(The data source decides. The default source asks for 10 posts per page.)*
- Can pages overlap, for example because new posts were published between requests? *(Yes. Deduplicate by post `id`; the first occurrence wins.)*
- What happens when a page fails to load? *(Show an error with a Retry button. Don't retry automatically, and don't let scrolling re-trigger the failed request.)*
- Does the first page wait for the user to scroll? *(No. It loads on mount.)*
- Should we virtualize long lists? *(Not for the base version. See the follow-ups.)*

## Functional requirements
- [ ] On mount, request the first page with `fetchPage(null, { signal })`.
- [ ] Render each post (author, body, and like count or date) as an article inside the feed, in the order received.
- [ ] Observe a sentinel element placed after the posts. When it intersects, request the next page with the last received `nextCursor`.
- [ ] While any page is loading, show a loading indicator and mark the feed as busy.
- [ ] **Never run two page requests at the same time.** Intersections that happen while a request is in flight are ignored, even if several arrive before React re-renders.
- [ ] Append new posts after the existing ones, skipping any post whose `id` is already displayed.
- [ ] When a response has `nextCursor: null`, stop loading: show `You're all caught up` and make no further requests.
- [ ] If the very first page is empty and has no next cursor, show `No posts yet` instead.
- [ ] If a request fails, show `Couldn't load posts` and a `Retry` button. Keep the posts already loaded. While in the error state, intersections do not trigger requests. `Retry` requests the same cursor again.
- [ ] When the component unmounts, abort the in-flight request and don't update state afterwards.

## Non-functional requirements
- **Accessibility:** follow the [WAI-ARIA Feed pattern](https://www.w3.org/WAI/ARIA/apg/patterns/feed/).
  - The list container has `role="feed"`, an accessible name (the `label` prop), and `aria-busy="true"` while a page is loading.
  - Each post is an `<article>` labelled by its author, with `aria-posinset` and `aria-setsize` (use the response's `total`).
  - Loading and end-of-list messages are announced through a live region (`role="status"`). The error uses `role="alert"`.
- **Performance:** no scroll listeners; one `IntersectionObserver` at a time; disconnect observers you no longer need. Appending a page must not re-create the elements of posts already rendered (stable `key`s).
- **UX:** start loading a little before the sentinel is actually visible (`rootMargin`, default `200px`). If the sentinel is still visible after a page loads (for example, a tall screen), keep loading until it isn't.

## Constraints
- 60 minutes. React and CSS Modules only. No data-fetching or infinite-scroll libraries.
- Default data source: `getFeed({ cursor, limit: 10 }, { signal })` from `src/mocks/api.ts`.
- Keep the public types in `types.ts` unchanged, because the tests and Playground depend on them.

## Data / API contract
```ts
interface Post { id: number; author: string; body: string; likes: number; createdAt: string }
interface Page<T> { items: T[]; nextCursor: number | null; total: number }

type FetchPage = (cursor: number | null, options: { signal: AbortSignal }) => Promise<Page<Post>>;

interface InfiniteFeedProps {
  fetchPage?: FetchPage; // default: getFeed({ cursor, limit: 10 }, { signal })
  label?: string;        // default "Posts"
  rootMargin?: string;   // default "200px"
}
```
Default-export the component from `Solution.tsx`.

## Test contract
- The container is a `feed` whose accessible name is the `label` prop (`Posts` by default). It has `aria-busy="true"` while a page is loading and not `"true"` otherwise.
- Each post is an `article` whose accessible name is the post's `author` and whose text contains the post's `body`.
- Loading text matches `/loading/i`. End text is `You're all caught up`. Empty text is `No posts yet`. Error text is `Couldn't load posts`, with a `button` named `Retry`.
- Tests replace the global `IntersectionObserver` with a fake. To simulate scrolling to the bottom, they call your observer's callback with `isIntersecting: true` for **every element you observe**, so observe only the sentinel. Create the observer with `new IntersectionObserver(callback, options)` and register the sentinel with `observe()`.
- Tests inject `fetchPage` as a mock that returns promises they control, and check its `cursor` argument, its `signal`, and how many times it was called.

## Edge cases
- Several intersection callbacks fire in the same tick, before React has re-rendered.
- The sentinel becomes visible while the first page is still loading.
- A page contains a post that was already on the previous page.
- The last page is shorter than the page size, or empty but with `nextCursor: null`.
- A request fails in the middle of the list, then succeeds on retry.
- The component unmounts mid-request, including React StrictMode's mount → unmount → mount in development.
- `fetchPage` changes identity on every parent render: this must not reset the feed or trigger extra requests.

## Follow-ups
1. **Windowing.** The user scrolls through 5,000 posts and the page gets sluggish. Keep the DOM small: render only the posts near the viewport while preserving the scrollbar, or discuss `content-visibility: auto` as a cheaper first step. What breaks in the feed pattern (`aria-posinset`, find-in-page)?
2. **Scroll restoration.** The user opens a post and presses Back. Restore the loaded pages and the exact scroll position without refetching everything. Where does that state live?
3. **New posts banner.** Poll for posts newer than the first one every 30 seconds. Instead of shifting the content, show a "3 new posts" button that prepends them and scrolls to the top.
4. **Feed keyboard navigation.** Make articles focusable and implement the feed pattern's `Page Down` / `Page Up` to move between articles, and `Ctrl+End` to move focus past the feed. Loading should also trigger when focus reaches the last article.
5. **Optimistic likes.** Add a like button per post using `toggleLike` (which fails 20% of the time). Update immediately, roll back on failure, and handle a second click while the first request is pending.
6. **Load more first.** Rippling asks it in this order. Start with a "Load more" button. Then switch to loading automatically on scroll behind a prop, sharing the same data hook. What changes, and what stays the same?

## Concepts covered
`IntersectionObserver` with a sentinel element · cursor pagination · refs as synchronous in-flight guards (versus state, which is stale inside callbacks) · `AbortController` on unmount · deduplicating by id with a `Set` · loading, error, empty and end-of-list states · the ARIA feed pattern.

Related: J11 Pagination · J25 hooks pack · S04 Virtualized List · S02 Autocomplete (cancellation and stale responses).
