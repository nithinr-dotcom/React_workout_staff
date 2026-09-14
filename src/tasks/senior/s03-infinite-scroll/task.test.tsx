import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { pickTarget } from '../../../test/target';
import * as Reference from './Reference';
import * as Solution from './Solution';
import type { FetchPage, Page, Post } from './types';

const { impl, describeTask } = pickTarget(Solution, Reference);
const InfiniteFeed = impl.default;

/* ---------- fake IntersectionObserver ---------- */

class FakeIntersectionObserver {
  static active = new Set<FakeIntersectionObserver>();
  elements = new Set<Element>();
  constructor(
    private callback: IntersectionObserverCallback,
    public options?: IntersectionObserverInit,
  ) {}
  observe(el: Element) {
    this.elements.add(el);
    FakeIntersectionObserver.active.add(this);
  }
  unobserve(el: Element) {
    this.elements.delete(el);
  }
  disconnect() {
    this.elements.clear();
    FakeIntersectionObserver.active.delete(this);
  }
  takeRecords() {
    return [];
  }
  fire(isIntersecting: boolean) {
    const entries = [...this.elements].map(
      (target) => ({ target, isIntersecting, intersectionRatio: isIntersecting ? 1 : 0 }) as unknown as IntersectionObserverEntry,
    );
    if (entries.length) this.callback(entries, this as unknown as IntersectionObserver);
  }
}

/** Simulates the sentinel scrolling into (or out of) view for every live observer. */
const scrollToBottom = (isIntersecting = true) =>
  act(() => {
    for (const observer of [...FakeIntersectionObserver.active]) observer.fire(isIntersecting);
  });

const originalIO = globalThis.IntersectionObserver;
beforeEach(() => {
  FakeIntersectionObserver.active.clear();
  globalThis.IntersectionObserver = FakeIntersectionObserver as unknown as typeof IntersectionObserver;
});
afterEach(() => {
  globalThis.IntersectionObserver = originalIO;
});

/* ---------- controllable data source ---------- */

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** Every call returns a new pending promise; resolve them in any order via `calls[i]`. */
function controlledFetcher() {
  const calls: ReturnType<typeof deferred<Page<Post>>>[] = [];
  const fetchPage = vi.fn<FetchPage>(() => {
    const d = deferred<Page<Post>>();
    calls.push(d);
    return d.promise;
  });
  return { fetchPage, calls };
}

const post = (id: number): Post => ({
  id,
  author: `Author ${id}`,
  body: `Body of post ${id}`,
  likes: id,
  createdAt: new Date(Date.UTC(2026, 7, 30, 12) - id * 60_000).toISOString(),
});
const page = (ids: number[], nextCursor: number | null, total = 30): Page<Post> => ({ items: ids.map(post), nextCursor, total });

const articles = () => screen.queryAllByRole('article');

describeTask('InfiniteFeed', () => {
  it('loads the first page on mount and renders each post as a named article', async () => {
    const { fetchPage, calls } = controlledFetcher();
    render(<InfiniteFeed fetchPage={fetchPage} />);

    const feed = screen.getByRole('feed', { name: 'Posts' });
    expect(fetchPage).toHaveBeenCalledTimes(1);
    expect(fetchPage).toHaveBeenCalledWith(null, expect.objectContaining({ signal: expect.any(AbortSignal) }));
    expect(feed).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByText(/loading/i)).toBeInTheDocument();

    await act(async () => calls[0].resolve(page([1, 2, 3], 3)));
    expect(articles()).toHaveLength(3);
    expect(screen.getByRole('article', { name: 'Author 2' })).toHaveTextContent('Body of post 2');
    expect(feed).not.toHaveAttribute('aria-busy', 'true');
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
  });

  it('loads the next page with the returned cursor when the sentinel intersects, appending in order', async () => {
    const { fetchPage, calls } = controlledFetcher();
    render(<InfiniteFeed fetchPage={fetchPage} label="Team updates" />);
    expect(screen.getByRole('feed', { name: 'Team updates' })).toBeInTheDocument();
    await act(async () => calls[0].resolve(page([1, 2, 3], 3)));

    scrollToBottom();
    expect(fetchPage).toHaveBeenCalledTimes(2);
    expect(fetchPage).toHaveBeenLastCalledWith(3, expect.objectContaining({ signal: expect.any(AbortSignal) }));
    expect(screen.getByRole('feed')).toHaveAttribute('aria-busy', 'true');

    await act(async () => calls[1].resolve(page([4, 5, 6], 6)));
    expect(articles().map((a) => a.textContent)).toEqual(
      [1, 2, 3, 4, 5, 6].map((id) => expect.stringContaining(`Body of post ${id}`)),
    );
  });

  it('ignores intersection events that are not intersecting', async () => {
    const { fetchPage, calls } = controlledFetcher();
    render(<InfiniteFeed fetchPage={fetchPage} />);
    await act(async () => calls[0].resolve(page([1, 2], 2)));
    scrollToBottom(false);
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });

  it('never runs two requests at once, even for several intersections in the same tick', async () => {
    const { fetchPage, calls } = controlledFetcher();
    render(<InfiniteFeed fetchPage={fetchPage} />);

    // Sentinel visible while the first page is still loading.
    scrollToBottom();
    expect(fetchPage).toHaveBeenCalledTimes(1);

    await act(async () => calls[0].resolve(page([1, 2], 2)));
    act(() => {
      for (const observer of [...FakeIntersectionObserver.active]) {
        observer.fire(true);
        observer.fire(true);
        observer.fire(true);
      }
    });
    expect(fetchPage).toHaveBeenCalledTimes(2);

    scrollToBottom();
    expect(fetchPage).toHaveBeenCalledTimes(2);
  });

  it('skips posts that were already rendered', async () => {
    const { fetchPage, calls } = controlledFetcher();
    render(<InfiniteFeed fetchPage={fetchPage} />);
    await act(async () => calls[0].resolve(page([1, 2, 3], 3)));
    scrollToBottom();
    await act(async () => calls[1].resolve(page([3, 4, 5], 6)));
    expect(articles()).toHaveLength(5);
    expect(screen.getAllByText('Body of post 3')).toHaveLength(1);
  });

  it('shows an end-of-list message and stops requesting when nextCursor is null', async () => {
    const { fetchPage, calls } = controlledFetcher();
    render(<InfiniteFeed fetchPage={fetchPage} />);
    await act(async () => calls[0].resolve(page([1, 2], 2, 3)));
    scrollToBottom();
    await act(async () => calls[1].resolve(page([3], null, 3)));

    expect(await screen.findByText("You're all caught up")).toBeInTheDocument();
    expect(articles()).toHaveLength(3);
    scrollToBottom();
    scrollToBottom();
    expect(fetchPage).toHaveBeenCalledTimes(2);
  });

  it('shows "No posts yet" when the first page is empty', async () => {
    const { fetchPage, calls } = controlledFetcher();
    render(<InfiniteFeed fetchPage={fetchPage} />);
    await act(async () => calls[0].resolve(page([], null, 0)));
    expect(screen.getByText('No posts yet')).toBeInTheDocument();
    expect(screen.queryByText("You're all caught up")).not.toBeInTheDocument();
    expect(articles()).toHaveLength(0);
  });

  it('shows an error with Retry, keeps loaded posts, does not auto-retry, and retries the same cursor', async () => {
    const user = userEvent.setup();
    const { fetchPage, calls } = controlledFetcher();
    render(<InfiniteFeed fetchPage={fetchPage} />);
    await act(async () => calls[0].resolve(page([1, 2], 2)));
    scrollToBottom();
    await act(async () => calls[1].reject(new Error('500')));

    expect(await screen.findByText("Couldn't load posts")).toBeInTheDocument();
    expect(articles()).toHaveLength(2);
    expect(screen.getByRole('feed')).not.toHaveAttribute('aria-busy', 'true');

    scrollToBottom();
    expect(fetchPage).toHaveBeenCalledTimes(2);

    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(fetchPage).toHaveBeenCalledTimes(3);
    expect(fetchPage.mock.calls[2][0]).toBe(2);

    await act(async () => calls[2].resolve(page([3, 4], 4)));
    expect(articles()).toHaveLength(4);
    expect(screen.queryByText("Couldn't load posts")).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
  });

  it('aborts the in-flight request on unmount', async () => {
    const { fetchPage, calls } = controlledFetcher();
    const { unmount } = render(<InfiniteFeed fetchPage={fetchPage} />);
    await act(async () => calls[0].resolve(page([1, 2], 2)));
    scrollToBottom();
    const { signal } = fetchPage.mock.calls[1][1];
    expect(signal.aborted).toBe(false);
    unmount();
    expect(signal.aborted).toBe(true);
  });

  it('does not restart the feed when the parent re-renders with a new fetchPage function', async () => {
    const { fetchPage, calls } = controlledFetcher();
    const { rerender } = render(<InfiniteFeed fetchPage={(...args) => fetchPage(...args)} />);
    await act(async () => calls[0].resolve(page([1, 2], 2)));
    rerender(<InfiniteFeed fetchPage={(...args) => fetchPage(...args)} />);
    rerender(<InfiniteFeed fetchPage={(...args) => fetchPage(...args)} />);
    expect(fetchPage).toHaveBeenCalledTimes(1);
    expect(articles()).toHaveLength(2);
  });
});
