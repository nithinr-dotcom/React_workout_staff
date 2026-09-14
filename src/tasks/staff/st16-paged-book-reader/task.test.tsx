// ⚠ Unverified: written before the reference solution. If a test looks wrong, trust the README.
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { pickTarget } from '../../../test/target';
import * as Reference from './Reference';
import * as Solution from './Solution';
import type { Book, BookApi, BookReaderModule, Page } from './types';

const { impl, describeTask } = pickTarget<BookReaderModule>(Solution, Reference);
const BookReader = impl.default;

const BOOKS: Book[] = [
  { id: 'moby', title: 'Moby-Dick', author: 'Herman Melville' },
  { id: 'emma', title: 'Emma', author: 'Jane Austen' },
];

const PAGE_HEIGHT = 100;
const VIEWPORT = 300; // three pages visible at a time

type Behaviour = 'resolve' | 'hang' | 'fail';

/**
 * Fake backend. Every request is recorded with its AbortSignal.
 * `behaviour(page, attempt)` decides whether a getPage call resolves (immediately), fails, or hangs until aborted.
 */
function fakeApi(pageCount = 120) {
  const calls: { page: number; signal: AbortSignal }[] = [];
  const attempts = new Map<number, number>();
  const state: { behaviour: (page: number, attempt: number) => Behaviour } = { behaviour: () => 'resolve' };
  const api = {
    getBooks: vi.fn(async () => BOOKS),
    getPageCount: vi.fn(async (_bookId: string) => pageCount),
    getPage: vi.fn((bookId: string, page: number, { signal }: { signal: AbortSignal }) => {
      calls.push({ page, signal });
      const attempt = (attempts.get(page) ?? 0) + 1;
      attempts.set(page, attempt);
      return new Promise<Page>((resolve, reject) => {
        signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
        const behaviour = state.behaviour(page, attempt);
        if (behaviour === 'resolve') resolve({ bookId, number: page, text: `Text of page ${page}` });
        if (behaviour === 'fail') reject(new Error('500'));
      });
    }),
  } satisfies BookApi;
  const requested = () => calls.map((c) => c.page);
  return { api, calls, state, requested };
}

const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);

/** Let pending promise callbacks and any short debounce timers run. */
const settle = () => act(() => new Promise((r) => setTimeout(r, 0)));

async function openBook(api: BookApi) {
  const user = userEvent.setup();
  render(<BookReader api={api} pageHeight={PAGE_HEIGHT} viewportHeight={VIEWPORT} />);
  await user.click(await screen.findByRole('button', { name: /Moby-Dick/ }));
  await screen.findByText('Page 1 of 120');
  return { user, pages: screen.getByRole('region', { name: 'Book pages' }) };
}

function scrollTo(container: HTMLElement, scrollTop: number) {
  container.scrollTop = scrollTop;
  fireEvent.scroll(container);
}

async function jumpTo(user: ReturnType<typeof userEvent.setup>, page: number) {
  const input = screen.getByRole('spinbutton', { name: 'Go to page' });
  await user.clear(input);
  await user.type(input, `${page}{Enter}`);
}

describeTask('createLruCache', () => {
  it('evicts the least recently used entry; get refreshes recency, has does not', () => {
    const cache = impl.createLruCache<string, number>(3);
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);
    expect(cache.get('a')).toBe(1);
    expect(cache.has('b')).toBe(true);
    cache.set('d', 4); // evicts b
    expect(cache.has('b')).toBe(false);
    expect(cache.keys()).toEqual(['c', 'a', 'd']);
    cache.set('c', 30); // update refreshes too
    expect(cache.keys()).toEqual(['a', 'd', 'c']);
    expect(cache.get('c')).toBe(30);
    expect(cache.size).toBe(3);
    expect(cache.delete('a')).toBe(true);
    expect(cache.get('a')).toBeUndefined();
    expect(cache.size).toBe(2);
  });
});

describeTask('Paged book reader', () => {
  it('lists books, opens one, and loads only the visible pages plus two on each side', async () => {
    const { api, requested } = fakeApi();
    const user = userEvent.setup();
    render(<BookReader api={api} pageHeight={PAGE_HEIGHT} viewportHeight={VIEWPORT} />);
    expect(screen.getByText('Loading books…')).toBeInTheDocument();
    await user.click(await screen.findByRole('button', { name: /Moby-Dick/ }));

    expect(await screen.findByRole('heading', { name: 'Moby-Dick' })).toBeInTheDocument();
    expect(api.getPageCount).toHaveBeenCalledWith('moby', expect.anything());
    expect(await screen.findByText('Page 1 of 120')).toBeInTheDocument();
    const page1 = await screen.findByRole('article', { name: 'Page 1' });
    expect(await within(page1).findByText('Text of page 1')).toBeInTheDocument();
    expect(await within(screen.getByRole('article', { name: 'Page 3' })).findByText('Text of page 3')).toBeInTheDocument();

    await waitFor(() => expect(requested()).toEqual(expect.arrayContaining(range(1, 5))));
    await settle();
    expect(Math.max(...requested())).toBeLessThanOrEqual(6);
    expect(api.getPage.mock.calls.every(([bookId]) => bookId === 'moby')).toBe(true);
  });

  it('scrolling updates the current page and fetches only pages around the new viewport', async () => {
    const { api, requested } = fakeApi();
    const { pages } = await openBook(api);
    await settle();
    const before = requested().length;

    scrollTo(pages, 29 * PAGE_HEIGHT); // page 30 at the top, 30–32 visible
    expect(await screen.findByText('Page 30 of 120')).toBeInTheDocument();
    const page30 = await screen.findByRole('article', { name: 'Page 30' });
    expect(await within(page30).findByText('Text of page 30')).toBeInTheDocument();

    await waitFor(() => expect(requested().slice(before)).toEqual(expect.arrayContaining(range(28, 34))));
    await settle();
    for (const page of requested().slice(before)) {
      expect(page).toBeGreaterThanOrEqual(27);
      expect(page).toBeLessThanOrEqual(35);
    }
  });

  it('cancels requests for pages that were scrolled past quickly', async () => {
    const { api, calls, state } = fakeApi();
    const { pages } = await openBook(api);
    await settle();
    state.behaviour = (page) => (page >= 20 && page <= 45 ? 'hang' : 'resolve');

    scrollTo(pages, 29 * PAGE_HEIGHT);
    scrollTo(pages, 79 * PAGE_HEIGHT);

    const page80 = await screen.findByRole('article', { name: 'Page 80' });
    expect(await within(page80).findByText('Text of page 80')).toBeInTheDocument();
    expect(screen.getByText('Page 80 of 120')).toBeInTheDocument();
    await settle();
    const skipped = calls.filter((c) => c.page >= 20 && c.page <= 45);
    // Either they were never requested (debounced) or they were aborted.
    expect(skipped.every((c) => c.signal.aborted)).toBe(true);
  });

  it('the "Go to page" input jumps to a page, clamping out-of-range values', async () => {
    const { api } = fakeApi();
    const { user, pages } = await openBook(api);

    await jumpTo(user, 57);
    expect(await screen.findByText('Page 57 of 120')).toBeInTheDocument();
    expect(pages.scrollTop).toBe(56 * PAGE_HEIGHT);
    const page57 = await screen.findByRole('article', { name: 'Page 57' });
    expect(await within(page57).findByText('Text of page 57')).toBeInTheDocument();

    await jumpTo(user, 999);
    expect(await screen.findByText('Page 120 of 120')).toBeInTheDocument();
    expect(await within(await screen.findByRole('article', { name: 'Page 120' })).findByText('Text of page 120')).toBeInTheDocument();
  });

  it('keeps at most 20 pages in the cache: recent pages are reused, old ones are fetched again', async () => {
    const { api, requested } = fakeApi();
    const { user } = await openBook(api);
    const visit = async (page: number) => {
      await jumpTo(user, page);
      await screen.findByText(`Page ${page} of 120`);
      await waitFor(() => expect(requested()).toContain(page + 4));
      await settle();
    };
    await waitFor(() => expect(requested()).toContain(5));
    await settle();
    // Each visit loads about 7 pages, so the pages around page 1 fall out of a 20-page cache.
    for (const page of [20, 40, 60, 80]) await visit(page);

    const countFor = (page: number) => requested().filter((p) => p === page).length;
    await jumpTo(user, 60);
    expect(await within(await screen.findByRole('article', { name: 'Page 60' })).findByText('Text of page 60')).toBeInTheDocument();
    await settle();
    expect(countFor(60)).toBe(1);

    await jumpTo(user, 1);
    expect(await within(await screen.findByRole('article', { name: 'Page 1' })).findByText('Text of page 1')).toBeInTheDocument();
    expect(countFor(1)).toBe(2);
  });

  it('shows a loading placeholder per page, and an error placeholder with a working retry', async () => {
    const { api, state, requested } = fakeApi();
    state.behaviour = (page, attempt) => (page === 2 && attempt === 1 ? 'fail' : page === 3 ? 'hang' : 'resolve');
    const user = userEvent.setup();
    render(<BookReader api={api} pageHeight={PAGE_HEIGHT} viewportHeight={VIEWPORT} />);
    await user.click(await screen.findByRole('button', { name: /Moby-Dick/ }));

    const page1 = await screen.findByRole('article', { name: 'Page 1' });
    expect(await within(page1).findByText('Text of page 1')).toBeInTheDocument();
    const page3 = screen.getByRole('article', { name: 'Page 3' });
    expect(within(page3).getByText(/loading/i)).toBeInTheDocument();

    const page2 = screen.getByRole('article', { name: 'Page 2' });
    const retry = await within(page2).findByRole('button', { name: /retry/i });
    expect(within(page2).queryByText('Text of page 2')).not.toBeInTheDocument();
    await user.click(retry);
    expect(await within(page2).findByText('Text of page 2')).toBeInTheDocument();
    expect(requested().filter((p) => p === 2)).toHaveLength(2);
  });

  it('going back to the book list aborts in-flight page requests', async () => {
    const { api, calls, state } = fakeApi();
    state.behaviour = () => 'hang';
    const user = userEvent.setup();
    render(<BookReader api={api} pageHeight={PAGE_HEIGHT} viewportHeight={VIEWPORT} />);
    await user.click(await screen.findByRole('button', { name: /Moby-Dick/ }));
    await waitFor(() => expect(calls.length).toBeGreaterThan(0));

    await user.click(screen.getByRole('button', { name: 'Back to books' }));
    expect(await screen.findByRole('button', { name: /Emma/ })).toBeInTheDocument();
    expect(calls.every((c) => c.signal.aborted)).toBe(true);
  });
});
