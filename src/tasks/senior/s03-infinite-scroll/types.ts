import type { Page, Post } from '../../../mocks/api';

export type { Page, Post };

/** Fetches one page. `cursor` is `null` for the first page, then the previous page's `nextCursor`. */
export type FetchPage = (cursor: number | null, options: { signal: AbortSignal }) => Promise<Page<Post>>;

export interface InfiniteFeedProps {
  /** Data source. Defaults to `getFeed({ cursor, limit: 10 }, { signal })` from the mock API. */
  fetchPage?: FetchPage;
  /** Accessible name of the feed. Default "Posts". */
  label?: string;
  /** How early to start loading before the end is visible (IntersectionObserver rootMargin). Default "200px". */
  rootMargin?: string;
}
