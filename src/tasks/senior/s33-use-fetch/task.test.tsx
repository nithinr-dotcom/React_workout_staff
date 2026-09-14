// ⚠ Unverified: written before the reference solution. If a test looks wrong, trust the README.
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { pickTarget } from '../../../test/target';
import * as Reference from './Reference';
import * as Solution from './Solution';
import type { Fetcher } from './types';

const { impl, describeTask } = pickTarget(Solution, Reference);

interface Call<T> {
  key: string;
  signal: AbortSignal;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
}

/** A fetcher whose promises settle only when the test says so. They ignore the abort signal on purpose. */
function createFetcher<T = string>() {
  const calls: Call<T>[] = [];
  const fetcher = vi.fn<Fetcher<T>>(
    (key, signal) =>
      new Promise<T>((resolve, reject) => {
        calls.push({ key, signal, resolve, reject });
      }),
  );
  return { fetcher, calls };
}

async function settle(fn: () => void) {
  await act(async () => {
    fn();
    await Promise.resolve();
  });
}

describeTask('useFetch', () => {
  beforeEach(() => {
    impl.clearCache();
  });

  it('loads, then exposes data with status "success"', async () => {
    const { fetcher, calls } = createFetcher();
    const { result } = renderHook(() => impl.useFetch('a', fetcher));

    expect(result.current.status).toBe('loading');
    expect(result.current.data).toBeUndefined();
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(calls[0].key).toBe('a');
    expect(calls[0].signal).toBeInstanceOf(AbortSignal);

    await settle(() => calls[0].resolve('A'));
    await waitFor(() => expect(result.current.status).toBe('success'));
    expect(result.current.data).toBe('A');
    expect(result.current.error).toBeUndefined();
    expect(result.current.isValidating).toBe(false);
  });

  it('exposes the error with status "error"', async () => {
    const { fetcher, calls } = createFetcher();
    const { result } = renderHook(() => impl.useFetch('a', fetcher));
    const boom = new Error('boom');

    await settle(() => calls[0].reject(boom));
    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.error).toBe(boom);
    expect(result.current.data).toBeUndefined();
    expect(result.current.isValidating).toBe(false);
  });

  it('does not fetch while enabled is false, and fetches once enabled', async () => {
    const { fetcher, calls } = createFetcher();
    const { result, rerender } = renderHook(({ enabled }) => impl.useFetch('a', fetcher, { enabled }), {
      initialProps: { enabled: false },
    });
    expect(result.current.status).toBe('idle');
    expect(fetcher).not.toHaveBeenCalled();

    rerender({ enabled: true });
    expect(fetcher).toHaveBeenCalledTimes(1);
    await settle(() => calls[0].resolve('A'));
    await waitFor(() => expect(result.current.data).toBe('A'));
  });

  it('aborts the previous request on key change and ignores its late response', async () => {
    const { fetcher, calls } = createFetcher();
    const { result, rerender } = renderHook(({ k }) => impl.useFetch(k, fetcher), { initialProps: { k: 'a' } });

    rerender({ k: 'b' });
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(calls[0].signal.aborted).toBe(true);
    expect(calls[1].key).toBe('b');
    expect(result.current.status).toBe('loading');

    // The stale response for "a" arrives first and must be ignored.
    await settle(() => calls[0].resolve('A'));
    expect(result.current.data).toBeUndefined();
    expect(result.current.status).toBe('loading');

    await settle(() => calls[1].resolve('B'));
    await waitFor(() => expect(result.current.data).toBe('B'));
  });

  it('never shows data from the previous key after a key change', async () => {
    const { fetcher, calls } = createFetcher();
    const { result, rerender } = renderHook(({ k }) => impl.useFetch(k, fetcher), { initialProps: { k: 'a' } });
    await settle(() => calls[0].resolve('A'));
    await waitFor(() => expect(result.current.data).toBe('A'));

    rerender({ k: 'b' });
    expect(result.current.data).toBeUndefined();
    expect(result.current.status).toBe('loading');

    await settle(() => calls[1].resolve('B'));
    await waitFor(() => expect(result.current.data).toBe('B'));
  });

  it('aborts on unmount and does not update afterwards', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { fetcher, calls } = createFetcher();
    const { unmount } = renderHook(() => impl.useFetch('a', fetcher));
    unmount();
    expect(calls[0].signal.aborted).toBe(true);
    await settle(() => calls[0].resolve('A'));
    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('does not refetch when only the fetcher identity changes', async () => {
    const { fetcher, calls } = createFetcher();
    const { result, rerender } = renderHook(({ f }) => impl.useFetch('a', f), {
      initialProps: { f: fetcher as Fetcher<string> },
    });
    rerender({ f: (key, signal) => fetcher(key, signal) });
    rerender({ f: (key, signal) => fetcher(key, signal) });
    expect(fetcher).toHaveBeenCalledTimes(1);
    await settle(() => calls[0].resolve('A'));
    await waitFor(() => expect(result.current.data).toBe('A'));
  });

  it('returns cached data on the first render, then revalidates in the background', async () => {
    const { fetcher, calls } = createFetcher();
    const first = renderHook(() => impl.useFetch('a', fetcher));
    await settle(() => calls[0].resolve('A'));
    await waitFor(() => expect(first.result.current.data).toBe('A'));
    first.unmount();

    const seen: (string | undefined)[] = [];
    const { result } = renderHook(() => {
      const r = impl.useFetch('a', fetcher);
      seen.push(r.data);
      return r;
    });
    expect(seen[0]).toBe('A');
    expect(result.current.status).toBe('success');
    expect(result.current.isValidating).toBe(true);
    expect(fetcher).toHaveBeenCalledTimes(2);

    await settle(() => calls[1].resolve('A2'));
    await waitFor(() => expect(result.current.data).toBe('A2'));
    expect(result.current.isValidating).toBe(false);
  });

  it('keeps the cache per key (A → B → A shows cached A immediately)', async () => {
    const { fetcher, calls } = createFetcher();
    const { result, rerender } = renderHook(({ k }) => impl.useFetch(k, fetcher), { initialProps: { k: 'a' } });
    await settle(() => calls[0].resolve('A'));
    await waitFor(() => expect(result.current.data).toBe('A'));

    rerender({ k: 'b' });
    expect(result.current.data).toBeUndefined();
    rerender({ k: 'a' });
    expect(result.current.data).toBe('A');
    expect(result.current.status).toBe('success');
  });

  it('de-duplicates identical in-flight requests across hooks', async () => {
    const { fetcher, calls } = createFetcher();
    const one = renderHook(() => impl.useFetch('a', fetcher));
    const two = renderHook(() => impl.useFetch('a', fetcher));
    expect(fetcher).toHaveBeenCalledTimes(1);

    await settle(() => calls[0].resolve('A'));
    await waitFor(() => {
      expect(one.result.current.data).toBe('A');
      expect(two.result.current.data).toBe('A');
    });
  });

  it('keeps a shared request alive while any subscriber remains', async () => {
    const { fetcher, calls } = createFetcher();
    const one = renderHook(() => impl.useFetch('a', fetcher));
    const two = renderHook(() => impl.useFetch('a', fetcher));

    one.unmount();
    expect(calls[0].signal.aborted).toBe(false);
    two.unmount();
    expect(calls[0].signal.aborted).toBe(true);
  });

  it('refetch() revalidates while keeping the current data visible', async () => {
    const { fetcher, calls } = createFetcher();
    const { result } = renderHook(() => impl.useFetch('a', fetcher));
    await settle(() => calls[0].resolve('A'));
    await waitFor(() => expect(result.current.data).toBe('A'));

    act(() => result.current.refetch());
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(result.current.data).toBe('A');
    expect(result.current.status).toBe('success');
    expect(result.current.isValidating).toBe(true);

    await settle(() => calls[1].resolve('A2'));
    await waitFor(() => expect(result.current.data).toBe('A2'));
    expect(result.current.isValidating).toBe(false);
  });

  it('keeps stale data when a revalidation fails', async () => {
    const { fetcher, calls } = createFetcher();
    const { result } = renderHook(() => impl.useFetch('a', fetcher));
    await settle(() => calls[0].resolve('A'));
    await waitFor(() => expect(result.current.data).toBe('A'));

    act(() => result.current.refetch());
    const boom = new Error('offline');
    await settle(() => calls[1].reject(boom));
    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.error).toBe(boom);
    expect(result.current.data).toBe('A');
  });
});
