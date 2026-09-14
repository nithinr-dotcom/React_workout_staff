import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { pickTarget } from '../../../test/target';
import * as Reference from './Reference';
import * as Solution from './Solution';
import type { FetchSuggestions, Suggestion } from './types';

const { impl, describeTask } = pickTarget(Solution, Reference);
const Autocomplete = impl.default;

const DEBOUNCE = 300;

const COUNTRIES: Suggestion[] = [
  { id: 'IN', label: 'India' },
  { id: 'ID', label: 'Indonesia' },
  { id: 'FI', label: 'Finland' },
];

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** A fetcher that answers instantly from a fixed list, filtering by substring. */
const instantFetcher = () =>
  vi.fn<FetchSuggestions>(async (query) => COUNTRIES.filter((c) => c.label.toLowerCase().includes(query.toLowerCase())));

function setup(props: Partial<Parameters<typeof Autocomplete>[0]> = {}) {
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  const onSelect = vi.fn();
  const fetchSuggestions = props.fetchSuggestions ?? instantFetcher();
  render(
    <Autocomplete label="Country" debounceMs={DEBOUNCE} onSelect={onSelect} {...props} fetchSuggestions={fetchSuggestions} />,
  );
  const input = screen.getByRole('combobox', { name: 'Country' });
  return { user, onSelect, fetchSuggestions: fetchSuggestions as ReturnType<typeof instantFetcher>, input };
}

const flushDebounce = () => act(() => vi.advanceTimersByTime(DEBOUNCE));

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});
afterEach(() => {
  vi.useRealTimers();
});

describeTask('Autocomplete', () => {
  it('renders a labelled, collapsed combobox with no listbox', () => {
    const { input } = setup();
    expect(input).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('debounces typing into a single request for the trimmed final query', async () => {
    const { user, input, fetchSuggestions } = setup();
    await user.type(input, '  ind ');
    act(() => vi.advanceTimersByTime(DEBOUNCE - 100));
    expect(fetchSuggestions).not.toHaveBeenCalled();
    await flushDebounce();
    expect(fetchSuggestions).toHaveBeenCalledTimes(1);
    expect(fetchSuggestions).toHaveBeenCalledWith('ind', expect.objectContaining({ signal: expect.any(AbortSignal) }));
  });

  it('shows a loading message, then options in a listbox controlled by the combobox', async () => {
    const d = deferred<Suggestion[]>();
    const { user, input } = setup({ fetchSuggestions: vi.fn(() => d.promise) });
    await user.type(input, 'ind');
    await flushDebounce();
    expect(await screen.findByText(/loading/i)).toBeInTheDocument();

    await act(async () => d.resolve([COUNTRIES[0], COUNTRIES[1]]));
    const listbox = await screen.findByRole('listbox');
    expect(input).toHaveAttribute('aria-expanded', 'true');
    expect(input).toHaveAttribute('aria-controls', listbox.id);
    expect(within(listbox).getAllByRole('option').map((o) => o.textContent)).toEqual(['India', 'Indonesia']);
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
  });

  it('wraps the matched part of each option in <mark>', async () => {
    const { user, input } = setup();
    await user.type(input, 'in');
    await flushDebounce();
    const finland = await screen.findByRole('option', { name: 'Finland' });
    const mark = finland.querySelector('mark');
    expect(mark).not.toBeNull();
    expect(mark).toHaveTextContent(/^in$/i);
  });

  it('shows "No results" when the source returns nothing', async () => {
    const { user, input } = setup({ fetchSuggestions: vi.fn(async () => []) });
    await user.type(input, 'zzz');
    await flushDebounce();
    expect(await screen.findByText('No results')).toBeInTheDocument();
    expect(screen.queryByRole('option')).not.toBeInTheDocument();
  });

  it('shows an error with a Retry button that re-runs the query', async () => {
    const fetchSuggestions = vi
      .fn<FetchSuggestions>()
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce([COUNTRIES[0]]);
    const { user, input } = setup({ fetchSuggestions });
    await user.type(input, 'ind');
    await flushDebounce();
    expect(await screen.findByText("Couldn't load suggestions")).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('option', { name: 'India' })).toBeInTheDocument();
    expect(fetchSuggestions).toHaveBeenCalledTimes(2);
    expect(fetchSuggestions).toHaveBeenLastCalledWith('ind', expect.anything());
    expect(screen.queryByText("Couldn't load suggestions")).not.toBeInTheDocument();
  });

  it('aborts the previous request and never shows a stale response', async () => {
    const first = deferred<Suggestion[]>();
    const second = deferred<Suggestion[]>();
    const fetchSuggestions = vi
      .fn<FetchSuggestions>()
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => second.promise);
    const { user, input } = setup({ fetchSuggestions });

    await user.type(input, 'in');
    await flushDebounce();
    await user.type(input, 'd');
    await flushDebounce();

    expect(fetchSuggestions).toHaveBeenCalledTimes(2);
    expect(fetchSuggestions.mock.calls[0][1].signal.aborted).toBe(true);
    expect(fetchSuggestions.mock.calls[1][1].signal.aborted).toBe(false);

    // The old request resolves anyway (the source ignored the abort): it must be ignored.
    await act(async () => first.resolve([{ id: 'stale', label: 'Stale result' }]));
    expect(screen.queryByRole('option', { name: 'Stale result' })).not.toBeInTheDocument();

    await act(async () => second.resolve([COUNTRIES[0]]));
    expect(await screen.findByRole('option', { name: 'India' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Stale result' })).not.toBeInTheDocument();
  });

  it('serves a repeated query from the cache', async () => {
    const { user, input, fetchSuggestions } = setup();
    await user.type(input, 'in');
    await flushDebounce();
    await screen.findByRole('option', { name: 'India' });

    await user.type(input, 'd');
    await flushDebounce();
    await screen.findByRole('option', { name: 'Indonesia' });
    await act(async () => {});
    expect(screen.queryByRole('option', { name: 'Finland' })).not.toBeInTheDocument();

    await user.type(input, '{Backspace}');
    await flushDebounce();
    expect(await screen.findByRole('option', { name: 'Finland' })).toBeInTheDocument();
    expect(fetchSuggestions.mock.calls.filter(([q]) => q === 'in')).toHaveLength(1);
  });

  it('navigates options with arrow keys (wrapping) using aria-activedescendant, and selects with Enter', async () => {
    const { user, input, onSelect, fetchSuggestions } = setup();
    await user.type(input, 'in');
    await flushDebounce();
    const options = await screen.findAllByRole('option');
    expect(options).toHaveLength(3);
    expect(input.getAttribute('aria-activedescendant') || null).toBeNull();

    const active = () => {
      const id = input.getAttribute('aria-activedescendant');
      return screen.getAllByRole('option').find((o) => id !== null && o.id === id);
    };

    await user.keyboard('{ArrowDown}');
    expect(active()).toHaveAccessibleName('India');
    expect(active()).toHaveAttribute('aria-selected', 'true');
    expect(input).toHaveFocus();

    await user.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}');
    expect(active()).toHaveAccessibleName('India');
    await user.keyboard('{ArrowUp}');
    expect(active()).toHaveAccessibleName('Finland');
    expect(screen.getByRole('option', { name: 'India' })).not.toHaveAttribute('aria-selected', 'true');

    await user.keyboard('{Enter}');
    expect(onSelect).toHaveBeenCalledWith(COUNTRIES[2]);
    expect(input).toHaveValue('Finland');
    expect(input).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();

    const callsBefore = fetchSuggestions.mock.calls.length;
    await flushDebounce();
    expect(fetchSuggestions).toHaveBeenCalledTimes(callsBefore);
  });

  it('selects an option on click and keeps focus in the input', async () => {
    const { user, input, onSelect } = setup();
    await user.type(input, 'ind');
    await flushDebounce();
    await user.click(await screen.findByRole('option', { name: 'Indonesia' }));
    expect(onSelect).toHaveBeenCalledWith(COUNTRIES[1]);
    expect(input).toHaveValue('Indonesia');
    expect(input).toHaveFocus();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('closes the list with Escape', async () => {
    const { user, input, onSelect } = setup();
    await user.type(input, 'ind');
    await flushDebounce();
    await screen.findByRole('listbox');
    await user.keyboard('{Escape}');
    expect(input).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(input).toHaveValue('ind');
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('does not search for a blank query and closes the list when the input is cleared', async () => {
    const { user, input, fetchSuggestions } = setup();
    await user.type(input, '   ');
    await flushDebounce();
    expect(fetchSuggestions).not.toHaveBeenCalled();

    await user.type(input, 'ind');
    await flushDebounce();
    await screen.findByRole('listbox');
    await user.clear(input);
    await flushDebounce();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(fetchSuggestions).toHaveBeenCalledTimes(1);
  });
});
