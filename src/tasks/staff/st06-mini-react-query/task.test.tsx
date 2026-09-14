// ⚠ Unverified: written before the reference solution. If a test looks wrong, trust the README.
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { expect, it, vi } from 'vitest';
import { pickTarget } from '../../../test/target';
import * as Reference from './Reference';
import * as Solution from './Solution';
import type { QueryClientApi, QueryKey } from './types';

const { impl, describeTask } = pickTarget(Solution, Reference);

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

interface ProbeProps {
  label?: string;
  queryKey?: QueryKey;
  fn: () => Promise<string>;
  staleTime?: number;
  gcTime?: number;
  enabled?: boolean;
  retry?: number;
}

/** Renders the useQuery result as text so tests can assert on it. */
function Probe({ label = 'todos', queryKey = ['todos'], fn, staleTime, gcTime, enabled, retry = 0 }: ProbeProps) {
  const q = impl.useQuery({ queryKey, queryFn: fn, staleTime, gcTime, enabled, retry, retryDelay: 0 });
  return (
    <div>
      <p>
        {label} status: {q.status}
      </p>
      <p>
        {label} fetching: {String(q.isFetching)}
      </p>
      <p>
        {label} data: {q.data ?? 'none'}
      </p>
      {q.error instanceof Error && <p>{label} error: {q.error.message}</p>}
      <button type="button" onClick={() => void q.refetch()}>
        Refetch {label}
      </button>
    </div>
  );
}

function withClient(ui: ReactNode, client: QueryClientApi) {
  return <impl.QueryClientProvider client={client}>{ui}</impl.QueryClientProvider>;
}

describeTask('Mini React Query', () => {
  it('goes from pending to success and passes queryKey and an AbortSignal to queryFn', async () => {
    const client = new impl.QueryClient();
    const fn = vi.fn().mockResolvedValue('A');
    render(withClient(<Probe fn={fn} />, client));

    expect(screen.getByText('todos status: pending')).toBeInTheDocument();
    expect(await screen.findByText('todos data: A')).toBeInTheDocument();
    expect(screen.getByText('todos status: success')).toBeInTheDocument();
    expect(screen.getByText('todos fetching: false')).toBeInTheDocument();
    expect(fn).toHaveBeenCalledWith(expect.objectContaining({ queryKey: ['todos'], signal: expect.any(AbortSignal) }));
    expect(client.getQueryData(['todos'])).toBe('A');
  });

  it('dedupes concurrent fetches for the same key', async () => {
    const client = new impl.QueryClient();
    const fn = vi.fn().mockResolvedValue('A');
    render(
      withClient(
        <>
          <Probe label="one" fn={fn} />
          <Probe label="two" fn={fn} />
        </>,
        client,
      ),
    );
    expect(await screen.findByText('one data: A')).toBeInTheDocument();
    expect(await screen.findByText('two data: A')).toBeInTheDocument();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('serves fresh cached data on remount without refetching, and refetch() forces a fetch', async () => {
    const user = userEvent.setup();
    const client = new impl.QueryClient();
    const fn = vi.fn().mockResolvedValueOnce('A').mockResolvedValueOnce('B');
    const first = render(withClient(<Probe fn={fn} staleTime={60_000} />, client));
    await screen.findByText('todos data: A');
    first.unmount();

    render(withClient(<Probe fn={fn} staleTime={60_000} />, client));
    // Cached data is available on the very first render.
    expect(screen.getByText('todos data: A')).toBeInTheDocument();
    await act(async () => {});
    expect(fn).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: 'Refetch todos' }));
    expect(await screen.findByText('todos data: B')).toBeInTheDocument();
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('shows stale data while revalidating in the background', async () => {
    const client = new impl.QueryClient();
    const second = deferred<string>();
    const fn = vi.fn().mockResolvedValueOnce('A').mockReturnValueOnce(second.promise);
    const first = render(withClient(<Probe fn={fn} staleTime={0} />, client));
    await screen.findByText('todos data: A');
    first.unmount();

    render(withClient(<Probe fn={fn} staleTime={0} />, client));
    expect(screen.getByText('todos data: A')).toBeInTheDocument();
    await waitFor(() => expect(fn).toHaveBeenCalledTimes(2));
    expect(await screen.findByText('todos fetching: true')).toBeInTheDocument();
    expect(screen.getByText('todos status: success')).toBeInTheDocument();
    expect(screen.getByText('todos data: A')).toBeInTheDocument();

    await act(async () => {
      second.resolve('B');
    });
    expect(await screen.findByText('todos data: B')).toBeInTheDocument();
    expect(screen.getByText('todos fetching: false')).toBeInTheDocument();
  });

  it('does not fetch while enabled is false, and fetches once enabled', async () => {
    const client = new impl.QueryClient();
    const fn = vi.fn().mockResolvedValue('A');
    const { rerender } = render(withClient(<Probe fn={fn} enabled={false} />, client));
    await act(async () => {});
    expect(fn).not.toHaveBeenCalled();
    expect(screen.getByText('todos status: pending')).toBeInTheDocument();
    expect(screen.getByText('todos fetching: false')).toBeInTheDocument();

    rerender(withClient(<Probe fn={fn} enabled />, client));
    expect(await screen.findByText('todos data: A')).toBeInTheDocument();
  });

  it('retries the configured number of times, then reports the error', async () => {
    const client = new impl.QueryClient();
    const fn = vi.fn().mockRejectedValue(new Error('boom'));
    render(withClient(<Probe fn={fn} retry={2} />, client));
    expect(await screen.findByText('todos error: boom')).toBeInTheDocument();
    expect(screen.getByText('todos status: error')).toBeInTheDocument();
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('fetches the new key when queryKey changes', async () => {
    const client = new impl.QueryClient();
    const fn = vi.fn((ctx: { queryKey: QueryKey }) => Promise.resolve(`page ${String(ctx.queryKey[1])}`));
    const { rerender } = render(withClient(<Probe queryKey={['todos', 1]} fn={fn as never} />, client));
    expect(await screen.findByText('todos data: page 1')).toBeInTheDocument();
    rerender(withClient(<Probe queryKey={['todos', 2]} fn={fn as never} />, client));
    expect(await screen.findByText('todos data: page 2')).toBeInTheDocument();
    expect(client.getQueryData(['todos', 1])).toBe('page 1');
  });

  it('invalidateQueries(prefix) refetches matching mounted queries after a mutation, even if fresh', async () => {
    const user = userEvent.setup();
    const client = new impl.QueryClient();
    const todosFn = vi.fn().mockResolvedValueOnce('v1').mockResolvedValueOnce('v2');
    const userFn = vi.fn().mockResolvedValue('ada');
    const addTodo = vi.fn((title: string) => Promise.resolve({ title }));

    function AddButton() {
      const queryClient = impl.useQueryClient();
      const mutation = impl.useMutation({
        mutationFn: addTodo,
        onSuccess: () => queryClient.invalidateQueries(['todos']),
      });
      return (
        <>
          <button type="button" onClick={() => mutation.mutate('buy milk')}>
            Add
          </button>
          <p>mutation: {mutation.status}</p>
        </>
      );
    }

    render(
      withClient(
        <>
          <Probe queryKey={['todos', { page: 1 }]} fn={todosFn} staleTime={60_000} />
          <Probe label="user" queryKey={['user']} fn={userFn} staleTime={60_000} />
          <AddButton />
        </>,
        client,
      ),
    );
    await screen.findByText('todos data: v1');
    await screen.findByText('user data: ada');

    await user.click(screen.getByRole('button', { name: 'Add' }));
    expect(await screen.findByText('mutation: success')).toBeInTheDocument();
    expect(addTodo).toHaveBeenCalledWith('buy milk');
    expect(await screen.findByText('todos data: v2')).toBeInTheDocument();
    expect(todosFn).toHaveBeenCalledTimes(2);
    expect(userFn).toHaveBeenCalledTimes(1);
  });

  it('hashKey is stable regardless of object property order', () => {
    expect(impl.hashKey(['todos', { page: 1, sort: { by: 'date', dir: 'asc' } }])).toBe(
      impl.hashKey(['todos', { sort: { dir: 'asc', by: 'date' }, page: 1 }]),
    );
    expect(impl.hashKey(['todos', 1])).not.toBe(impl.hashKey(['todos', '1']));
    expect(impl.hashKey(['todos', { page: 1 }])).not.toBe(impl.hashKey(['todos', { page: 2 }]));
  });

  it('garbage-collects a query gcTime ms after its last observer unmounts', async () => {
    const client = new impl.QueryClient();
    const fn = vi.fn().mockResolvedValue('A');
    const { unmount } = render(withClient(<Probe fn={fn} gcTime={50} staleTime={60_000} />, client));
    await screen.findByText('todos data: A');
    await new Promise((r) => setTimeout(r, 100));
    expect(client.getQueryData(['todos'])).toBe('A');

    unmount();
    await waitFor(() => expect(client.getQueryData(['todos'])).toBeUndefined());
  });
});
