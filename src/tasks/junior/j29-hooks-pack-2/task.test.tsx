// ⚠ Unverified: written before the reference solution. If a test looks wrong, trust the README.
import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRef } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { pickTarget } from '../../../test/target';
import * as Reference from './Reference';
import * as Solution from './Solution';

const { impl, describeTask, describeFollowUp } = pickTarget(Solution, Reference);

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describeTask('useInterval', () => {
  it('calls the callback every delay ms and stops on unmount', () => {
    vi.useFakeTimers();
    const cb = vi.fn();
    const { unmount } = renderHook(() => impl.useInterval(cb, 100));
    act(() => vi.advanceTimersByTime(99));
    expect(cb).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(cb).toHaveBeenCalledTimes(1);
    act(() => vi.advanceTimersByTime(200));
    expect(cb).toHaveBeenCalledTimes(3);
    unmount();
    act(() => vi.advanceTimersByTime(1000));
    expect(cb).toHaveBeenCalledTimes(3);
  });

  it('uses the latest callback without restarting the interval', () => {
    vi.useFakeTimers();
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = renderHook(({ cb }) => impl.useInterval(cb, 100), { initialProps: { cb: first } });
    act(() => vi.advanceTimersByTime(60));
    rerender({ cb: second });
    act(() => vi.advanceTimersByTime(40));
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('pauses with a null delay and resumes with a number', () => {
    vi.useFakeTimers();
    const cb = vi.fn();
    const { rerender } = renderHook(({ delay }: { delay: number | null }) => impl.useInterval(cb, delay), {
      initialProps: { delay: null as number | null },
    });
    act(() => vi.advanceTimersByTime(1000));
    expect(cb).not.toHaveBeenCalled();
    rerender({ delay: 50 });
    act(() => vi.advanceTimersByTime(50));
    expect(cb).toHaveBeenCalledTimes(1);
    rerender({ delay: null });
    act(() => vi.advanceTimersByTime(1000));
    expect(cb).toHaveBeenCalledTimes(1);
  });
});

describeTask('useTimeout', () => {
  it('fires once after delay using the latest callback', () => {
    vi.useFakeTimers();
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = renderHook(({ cb }) => impl.useTimeout(cb, 100), { initialProps: { cb: first } });
    act(() => vi.advanceTimersByTime(70));
    rerender({ cb: second });
    act(() => vi.advanceTimersByTime(30));
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
    act(() => vi.advanceTimersByTime(1000));
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('clear() cancels, reset() restarts (even after firing), and both are stable', () => {
    vi.useFakeTimers();
    const cb = vi.fn();
    const { result, rerender } = renderHook(() => impl.useTimeout(cb, 100));
    const { clear, reset } = result.current;

    act(() => vi.advanceTimersByTime(50));
    act(() => result.current.clear());
    act(() => vi.advanceTimersByTime(500));
    expect(cb).not.toHaveBeenCalled();

    act(() => result.current.reset());
    act(() => vi.advanceTimersByTime(99));
    expect(cb).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(cb).toHaveBeenCalledTimes(1);

    act(() => result.current.reset());
    act(() => vi.advanceTimersByTime(100));
    expect(cb).toHaveBeenCalledTimes(2);

    rerender();
    expect(result.current.clear).toBe(clear);
    expect(result.current.reset).toBe(reset);
  });

  it('schedules nothing for a null delay, and does not fire after unmount', () => {
    vi.useFakeTimers();
    const paused = vi.fn();
    renderHook(() => impl.useTimeout(paused, null));
    act(() => vi.advanceTimersByTime(10_000));
    expect(paused).not.toHaveBeenCalled();

    const cb = vi.fn();
    const { unmount } = renderHook(() => impl.useTimeout(cb, 100));
    unmount();
    act(() => vi.advanceTimersByTime(1000));
    expect(cb).not.toHaveBeenCalled();
  });
});

describeTask('useThrottle', () => {
  it('returns a change immediately after a quiet period, and the latest value when the window ends', () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(({ v }) => impl.useThrottle(v, 300), { initialProps: { v: 'a' } });
    expect(result.current).toBe('a');

    act(() => vi.advanceTimersByTime(1000));
    rerender({ v: 'b' });
    expect(result.current).toBe('b');

    act(() => vi.advanceTimersByTime(100));
    rerender({ v: 'c' });
    act(() => vi.advanceTimersByTime(100));
    rerender({ v: 'd' });
    expect(result.current).toBe('b');

    act(() => vi.advanceTimersByTime(99));
    expect(result.current).toBe('b');
    act(() => vi.advanceTimersByTime(1));
    expect(result.current).toBe('d');

    act(() => vi.advanceTimersByTime(1000));
    expect(result.current).toBe('d');
  });
});

describeTask('useWindowSize', () => {
  it('reads the window size, updates on resize and removes its listener on unmount', () => {
    const add = vi.spyOn(window, 'addEventListener');
    const remove = vi.spyOn(window, 'removeEventListener');
    window.innerWidth = 1024;
    window.innerHeight = 768;
    const { result, unmount } = renderHook(() => impl.useWindowSize());
    expect(result.current).toEqual({ width: 1024, height: 768 });

    act(() => {
      window.innerWidth = 375;
      window.innerHeight = 812;
      window.dispatchEvent(new Event('resize'));
    });
    expect(result.current).toEqual({ width: 375, height: 812 });

    const added = add.mock.calls.filter(([type]) => type === 'resize').map(([, listener]) => listener);
    expect(added.length).toBeGreaterThan(0);
    unmount();
    const removed = remove.mock.calls.filter(([type]) => type === 'resize').map(([, listener]) => listener);
    for (const listener of added) expect(removed).toContain(listener);
  });
});

describeTask('useMediaQuery', () => {
  type Listener = (event: { matches: boolean; media: string }) => void;
  function installMatchMedia(initial: Record<string, boolean>) {
    const lists = new Map<string, { matches: boolean; media: string; listeners: Set<Listener> }>();
    const getList = (query: string) => {
      let list = lists.get(query);
      if (!list) {
        const listeners = new Set<Listener>();
        list = {
          matches: initial[query] ?? false,
          media: query,
          listeners,
          addEventListener: (_type: string, l: Listener) => listeners.add(l),
          removeEventListener: (_type: string, l: Listener) => listeners.delete(l),
          addListener: (l: Listener) => listeners.add(l),
          removeListener: (l: Listener) => listeners.delete(l),
          onchange: null,
          dispatchEvent: () => true,
        } as unknown as { matches: boolean; media: string; listeners: Set<Listener> };
        lists.set(query, list);
      }
      return list;
    };
    vi.stubGlobal(
      'matchMedia',
      vi.fn((query: string) => getList(query)),
    );
    return {
      set(query: string, matches: boolean) {
        const list = getList(query);
        list.matches = matches;
        for (const l of [...list.listeners]) l({ matches, media: query });
      },
      listenerCount: (query: string) => getList(query).listeners.size,
    };
  }

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns the current match and updates on change', () => {
    const mm = installMatchMedia({ '(max-width: 600px)': true });
    const { result } = renderHook(() => impl.useMediaQuery('(max-width: 600px)'));
    expect(result.current).toBe(true);
    act(() => mm.set('(max-width: 600px)', false));
    expect(result.current).toBe(false);
    act(() => mm.set('(max-width: 600px)', true));
    expect(result.current).toBe(true);
  });

  it('switches subscriptions when the query changes and cleans up on unmount', () => {
    const dark = '(prefers-color-scheme: dark)';
    const motion = '(prefers-reduced-motion: reduce)';
    const mm = installMatchMedia({ [dark]: false, [motion]: true });
    const { result, rerender, unmount } = renderHook(({ q }) => impl.useMediaQuery(q), { initialProps: { q: dark } });
    expect(result.current).toBe(false);

    rerender({ q: motion });
    expect(result.current).toBe(true);
    expect(mm.listenerCount(dark)).toBe(0);
    expect(mm.listenerCount(motion)).toBeGreaterThan(0);

    unmount();
    expect(mm.listenerCount(motion)).toBe(0);
  });
});

describeTask('useHover', () => {
  function HoverBox() {
    const ref = useRef<HTMLDivElement>(null);
    const hovered = impl.useHover(ref);
    return (
      <div>
        <div ref={ref}>
          <button>Target</button>
        </div>
        <button>Elsewhere</button>
        <p>hovered: {String(hovered)}</p>
      </div>
    );
  }

  it('is true while the pointer is over the element and false after it leaves', async () => {
    const user = userEvent.setup();
    render(<HoverBox />);
    expect(screen.getByText('hovered: false')).toBeInTheDocument();
    await user.hover(screen.getByRole('button', { name: 'Target' }));
    expect(screen.getByText('hovered: true')).toBeInTheDocument();
    await user.unhover(screen.getByRole('button', { name: 'Target' }));
    await user.hover(screen.getByRole('button', { name: 'Elsewhere' }));
    expect(screen.getByText('hovered: false')).toBeInTheDocument();
  });
});

describeTask('useEventListener', () => {
  it('calls the latest handler without re-subscribing, and removes the listener on unmount', () => {
    const add = vi.spyOn(window, 'addEventListener');
    const first = vi.fn();
    const second = vi.fn();
    const { rerender, unmount } = renderHook(({ h }) => impl.useEventListener(window, 'keydown', h), {
      initialProps: { h: first },
    });
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
    });
    expect(first).toHaveBeenCalledTimes(1);
    expect(first.mock.calls[0][0]).toBeInstanceOf(KeyboardEvent);

    const addsBefore = add.mock.calls.filter(([type]) => type === 'keydown').length;
    rerender({ h: second });
    rerender({ h: second });
    expect(add.mock.calls.filter(([type]) => type === 'keydown').length).toBe(addsBefore);

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'b' }));
    });
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);

    unmount();
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'c' }));
    });
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('accepts a ref target, ignores null targets, and follows a type change', () => {
    const handler = vi.fn();
    function Box({ type }: { type: string }) {
      const ref = useRef<HTMLButtonElement>(null);
      impl.useEventListener(ref, type, handler);
      impl.useEventListener(null, type, handler);
      return <button ref={ref}>Box</button>;
    }
    const { rerender } = render(<Box type="focus" />);
    const button = screen.getByRole('button', { name: 'Box' });
    fireEvent.focus(button);
    expect(handler).toHaveBeenCalledTimes(1);

    rerender(<Box type="blur" />);
    fireEvent.focus(button);
    expect(handler).toHaveBeenCalledTimes(1);
    fireEvent.blur(button);
    expect(handler).toHaveBeenCalledTimes(2);
  });
});

describeTask('useIsFirstRender', () => {
  it('is true only on the first render', () => {
    const { result, rerender } = renderHook(() => impl.useIsFirstRender());
    expect(result.current).toBe(true);
    rerender();
    expect(result.current).toBe(false);
    rerender();
    expect(result.current).toBe(false);
  });
});

describeTask('useUpdateEffect', () => {
  it('skips the mount, runs when deps change, and cleans up', () => {
    const cleanup = vi.fn();
    const effect = vi.fn(() => cleanup);
    const { rerender, unmount } = renderHook(({ n }) => impl.useUpdateEffect(effect, [n]), {
      initialProps: { n: 1 },
    });
    expect(effect).not.toHaveBeenCalled();

    rerender({ n: 1 });
    expect(effect).not.toHaveBeenCalled();

    rerender({ n: 2 });
    expect(effect).toHaveBeenCalledTimes(1);
    expect(cleanup).not.toHaveBeenCalled();

    rerender({ n: 3 });
    expect(effect).toHaveBeenCalledTimes(2);
    expect(cleanup).toHaveBeenCalledTimes(1);

    unmount();
    expect(cleanup).toHaveBeenCalledTimes(2);
  });
});

describeFollowUp(1, 'useIdle', () => {
  it('becomes idle after ms without activity and resets on activity', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => impl.useIdle(1000));
    expect(result.current).toBe(false);
    act(() => vi.advanceTimersByTime(600));
    act(() => {
      fireEvent.keyDown(document.body, { key: 'x' });
    });
    act(() => vi.advanceTimersByTime(600));
    expect(result.current).toBe(false);
    act(() => vi.advanceTimersByTime(400));
    expect(result.current).toBe(true);
    act(() => {
      fireEvent.keyDown(document.body, { key: 'y' });
    });
    expect(result.current).toBe(false);
  });
});
