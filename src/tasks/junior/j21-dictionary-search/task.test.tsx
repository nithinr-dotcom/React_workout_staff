// ⚠ Unverified: written before the reference solution. If a test looks wrong, trust the README.
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';
import { ApiError, lookupWord } from '../../../mocks/api';
import { pickTarget } from '../../../test/target';
import * as Reference from './Reference';
import * as Solution from './Solution';
import type { WordResult } from './types';

vi.mock('../../../mocks/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../mocks/api')>();
  return { ...actual, lookupWord: vi.fn() };
});

const { impl, describeTask, describeFollowUp } = pickTarget(Solution, Reference);
const DictionarySearch = impl.default;
const lookupMock = vi.mocked(lookupWord);

const CLOSURE: WordResult = {
  word: 'closure',
  meanings: [
    { partOfSpeech: 'noun', definition: 'A function bundled with its lexical scope.' },
    { partOfSpeech: 'noun', definition: 'The act of closing something.' },
  ],
};
const MEMOIZE: WordResult = {
  word: 'memoize',
  meanings: [{ partOfSpeech: 'verb', definition: 'Cache the result of a function call.' }],
};

interface Pending {
  word: string;
  signal?: AbortSignal;
  resolve: (value: WordResult) => void;
  reject: (reason: unknown) => void;
}
let pending: Pending[] = [];

/** Every call returns a promise the test settles manually. Aborting rejects it like the real API. */
function deferLookups() {
  lookupMock.mockImplementation(
    (word, options) =>
      new Promise<WordResult>((resolve, reject) => {
        const signal = options?.signal;
        pending.push({ word, signal, resolve, reject });
        signal?.addEventListener('abort', () => reject(new DOMException('The operation was aborted.', 'AbortError')));
      }),
  );
}

beforeEach(() => {
  pending = [];
  lookupMock.mockReset();
});

const input = () => screen.getByLabelText('Word');
const searchButton = () => screen.getByRole('button', { name: 'Search' });

async function search(user: ReturnType<typeof userEvent.setup>, word: string) {
  await user.clear(input());
  await user.type(input(), word);
  await user.click(searchButton());
}

describeTask('DictionarySearch', () => {
  it('shows the idle prompt, a labelled input and a Search button', () => {
    render(<DictionarySearch />);
    expect(screen.getByText('Search for a word to see its definition.')).toBeInTheDocument();
    expect(input()).toBeInTheDocument();
    expect(searchButton()).toBeInTheDocument();
  });

  it('does not search for a blank word', async () => {
    const user = userEvent.setup();
    render(<DictionarySearch />);
    await user.type(input(), '   ');
    await user.click(searchButton());
    expect(screen.getByText('Please enter a word.')).toBeInTheDocument();
    expect(lookupMock).not.toHaveBeenCalled();
  });

  it('shows loading, then the word and its meanings', async () => {
    deferLookups();
    const user = userEvent.setup();
    render(<DictionarySearch />);
    await search(user, '  closure ');
    expect(lookupMock).toHaveBeenCalledTimes(1);
    expect(lookupMock.mock.calls[0][0]).toBe('closure');
    expect(screen.getByText(/loading/i)).toBeInTheDocument();

    await act(async () => pending[0].resolve(CLOSURE));
    expect(screen.getByRole('heading', { level: 2, name: 'closure' })).toBeInTheDocument();
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent('noun');
    expect(items[0]).toHaveTextContent('A function bundled with its lexical scope.');
    expect(items[1]).toHaveTextContent('The act of closing something.');
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
  });

  it('submits with Enter', async () => {
    lookupMock.mockResolvedValue(MEMOIZE);
    const user = userEvent.setup();
    render(<DictionarySearch />);
    await user.type(input(), 'memoize{Enter}');
    expect(await screen.findByRole('heading', { level: 2, name: 'memoize' })).toBeInTheDocument();
  });

  it('shows a not-found message (not an alert) for 404s', async () => {
    lookupMock.mockRejectedValue(new ApiError('No definition found for "blorp"', 404));
    const user = userEvent.setup();
    render(<DictionarySearch />);
    await search(user, 'blorp');
    expect(await screen.findByText('No definitions found for "blorp".')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows an alert with Retry for other errors, and Retry repeats the search', async () => {
    lookupMock.mockRejectedValueOnce(new ApiError('Mock server error, please retry.', 500)).mockResolvedValueOnce(CLOSURE);
    const user = userEvent.setup();
    render(<DictionarySearch />);
    await search(user, 'closure');
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Something went wrong');

    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('heading', { level: 2, name: 'closure' })).toBeInTheDocument();
    expect(lookupMock).toHaveBeenCalledTimes(2);
    expect(lookupMock.mock.calls[1][0]).toBe('closure');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('aborts the previous request when a new search starts', async () => {
    deferLookups();
    const user = userEvent.setup();
    render(<DictionarySearch />);
    await search(user, 'closure');
    await search(user, 'memoize');
    expect(pending).toHaveLength(2);
    expect(pending[0].signal).toBeInstanceOf(AbortSignal);
    expect(pending[0].signal?.aborted).toBe(true);
    expect(pending[1].signal?.aborted).toBe(false);
  });

  it('ignores a stale response that arrives after a newer search started', async () => {
    deferLookups();
    const user = userEvent.setup();
    render(<DictionarySearch />);
    await search(user, 'closure');
    await search(user, 'memoize');

    // The old request settles first (resolve is a no-op if it was already aborted).
    await act(async () => pending[0].resolve(CLOSURE));
    expect(screen.queryByRole('heading', { name: 'closure' })).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();

    await act(async () => pending[1].resolve(MEMOIZE));
    expect(screen.getByRole('heading', { level: 2, name: 'memoize' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'closure' })).not.toBeInTheDocument();
  });

  it('replaces a previous result or error when searching again', async () => {
    lookupMock.mockRejectedValueOnce(new ApiError('boom', 500));
    const user = userEvent.setup();
    render(<DictionarySearch />);
    await search(user, 'closure');
    await screen.findByRole('alert');

    deferLookups();
    await search(user, 'memoize');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
    await act(async () => pending[0].resolve(MEMOIZE));
    const heading = screen.getByRole('heading', { level: 2, name: 'memoize' });
    expect(heading).toBeInTheDocument();
    expect(within(screen.getByRole('list')).getByText(/Cache the result/)).toBeInTheDocument();
  });
});

describeFollowUp(1, 'search as you type', () => {
  it('searches once, after the user stops typing', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    lookupMock.mockResolvedValue(MEMOIZE);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<DictionarySearch searchAsYouTypeMs={300} />);
    await user.type(input(), 'memoize');
    expect(lookupMock).not.toHaveBeenCalled();
    await act(async () => {
      vi.advanceTimersByTime(300);
    });
    expect(lookupMock).toHaveBeenCalledTimes(1);
    expect(lookupMock.mock.calls[0][0]).toBe('memoize');
    expect(await screen.findByRole('heading', { level: 2, name: 'memoize' })).toBeInTheDocument();
  });

  it('clearing the input cancels the pending search and shows the idle prompt', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<DictionarySearch searchAsYouTypeMs={300} />);
    await user.type(input(), 'mem');
    await user.clear(input());
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });
    expect(lookupMock).not.toHaveBeenCalled();
    expect(screen.getByText('Search for a word to see its definition.')).toBeInTheDocument();
  });
});

describeFollowUp(2, 'cache', () => {
  it('serves a repeated search from memory without a request', async () => {
    lookupMock.mockResolvedValueOnce(CLOSURE).mockResolvedValueOnce(MEMOIZE);
    const user = userEvent.setup();
    render(<DictionarySearch />);
    await search(user, 'closure');
    await screen.findByRole('heading', { level: 2, name: 'closure' });
    await search(user, 'memoize');
    await screen.findByRole('heading', { level: 2, name: 'memoize' });
    await search(user, ' Closure');
    expect(screen.getByRole('heading', { level: 2, name: 'closure' })).toBeInTheDocument();
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    expect(lookupMock).toHaveBeenCalledTimes(2);
  });
});
