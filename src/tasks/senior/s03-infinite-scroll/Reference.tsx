import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { getFeed } from '../../../mocks/api';
import type { FetchPage, InfiniteFeedProps, Post } from './types';
import styles from './Reference.module.css';

type Status = 'loading' | 'idle' | 'error' | 'done';

const defaultFetchPage: FetchPage = (cursor, { signal }) => getFeed({ cursor, limit: 10 }, { signal });

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });

export default function InfiniteFeed({ fetchPage = defaultFetchPage, label = 'Posts', rootMargin = '200px' }: InfiniteFeedProps) {
  const baseId = useId();
  const [posts, setPosts] = useState<Post[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [status, setStatus] = useState<Status>('loading');
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Refs are read synchronously inside observer callbacks, where state from the last render may be stale.
  const cursorRef = useRef<number | null>(null);
  const inFlightRef = useRef<AbortController | null>(null);
  const doneRef = useRef(false);

  // Latest fetcher, so a new function identity from the parent never resets the feed.
  const fetchRef = useRef(fetchPage);
  useLayoutEffect(() => {
    fetchRef.current = fetchPage;
  });

  const loadMore = useCallback(async () => {
    if (inFlightRef.current || doneRef.current) return;
    const controller = new AbortController();
    inFlightRef.current = controller;
    setStatus('loading');
    try {
      const page = await fetchRef.current(cursorRef.current, { signal: controller.signal });
      if (controller.signal.aborted) return;
      setPosts((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        const fresh: Post[] = [];
        for (const post of page.items) {
          if (seen.has(post.id)) continue;
          seen.add(post.id);
          fresh.push(post);
        }
        return fresh.length ? [...prev, ...fresh] : prev;
      });
      setTotal(page.total);
      cursorRef.current = page.nextCursor;
      doneRef.current = page.nextCursor === null;
      setStatus(doneRef.current ? 'done' : 'idle');
    } catch {
      if (controller.signal.aborted) return;
      setStatus('error');
    } finally {
      if (inFlightRef.current === controller) inFlightRef.current = null;
    }
  }, []);

  // First page on mount; abort on unmount. StrictMode's remount simply starts the request again.
  useEffect(() => {
    void loadMore();
    return () => {
      inFlightRef.current?.abort();
      inFlightRef.current = null;
    };
  }, [loadMore]);

  // Observe the sentinel only while idle. Re-creating the observer after each page makes the browser
  // report the current intersection again, so a sentinel that is still on screen keeps loading.
  useEffect(() => {
    if (status !== 'idle') return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) void loadMore();
      },
      { rootMargin },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [status, rootMargin, loadMore]);

  const isEmpty = status === 'done' && posts.length === 0;
  const statusText =
    status === 'loading'
      ? posts.length === 0
        ? 'Loading posts…'
        : 'Loading more posts…'
      : isEmpty
        ? 'No posts yet'
        : status === 'done'
          ? "You're all caught up"
          : '';

  return (
    <div className={styles.root}>
      <div role="feed" aria-label={label} aria-busy={status === 'loading'} className={styles.feed}>
        {posts.map((post, index) => {
          const authorId = `${baseId}-author-${post.id}`;
          return (
            <article
              key={post.id}
              className={styles.post}
              aria-labelledby={authorId}
              aria-posinset={index + 1}
              aria-setsize={total ?? -1}
            >
              <header className={styles.header}>
                <strong id={authorId}>{post.author}</strong>
                <time dateTime={post.createdAt} className={styles.meta}>
                  {dateFormat.format(new Date(post.createdAt))}
                </time>
              </header>
              <p className={styles.body}>{post.body}</p>
              <footer className={styles.meta}>♥ {post.likes}</footer>
            </article>
          );
        })}
      </div>

      <div ref={sentinelRef} className={styles.sentinel} aria-hidden="true" />

      <div role="status" className={styles.status}>
        {status === 'loading' && <span className={styles.spinner} aria-hidden="true" />}
        {statusText}
      </div>

      {status === 'error' && (
        <div role="alert" className={styles.error}>
          <span>Couldn't load posts</span>
          <button type="button" className={styles.retry} onClick={() => void loadMore()}>
            Retry
          </button>
        </div>
      )}
    </div>
  );
}
