// ⚠ Unverified: written before the reference solution. If a test looks wrong, trust the README.
import { act, render, renderHook, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRef } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { pickTarget } from '../../../test/target';
import * as Reference from './Reference';
import * as Solution from './Solution';

const { impl, describeTask, describeFollowUp } = pickTarget(Solution, Reference);

afterEach(() => {
  vi.useRealTimers();
});

describeTask('useToggle', () => {
  it('starts with the initial value (default false) and toggles', () => {
    const { result } = renderHook(() => impl.useToggle());
    expect(result.current[0]).toBe(false);
    act(() => result.current[1]());
    expect(result.current[0]).toBe(true);

    const { result: r2 } = renderHook(() => impl.useToggle(true));
    expect(r2.current[0]).toBe(true);
  });

  it('flips twice when toggled twice in one batch, and setValue sets explicitly', () => {
    const { result } = renderHook(() => impl.useToggle(false));
    act(() => {
      result.current[1]();
      result.current[1]();
    });
    expect(result.current[0]).toBe(false);
    act(() => result.current[2](true));
    expect(result.current[0]).toBe(true);
    act(() => result.current[2](true));
    expect(result.current[0]).toBe(true);
  });

  it('keeps toggle and setValue identities stable', () => {
    const { result } = renderHook(() => impl.useToggle());
    const [, toggle, setValue] = result.current;
    act(() => toggle());
    expect(result.current[1]).toBe(toggle);
    expect(result.current[2]).toBe(setValue);
  });
});

describeTask('usePrevious', () => {
  it('returns undefined first, then the previous render value', () => {
    const { result, rerender } = renderHook(({ v }) => impl.usePrevious(v), { initialProps: { v: 1 } });
    expect(result.current).toBeUndefined();
    rerender({ v: 2 });
    expect(result.current).toBe(1);
    rerender({ v: 3 });
    expect(result.current).toBe(2);
  });
});

describeTask('useLocalStorage', () => {
  it('uses initialValue when the key is missing, and persists updates as JSON', () => {
    const { result } = renderHook(() => impl.useLocalStorage('prefs', { compact: false }));
    expect(result.current[0]).toEqual({ compact: false });
    act(() => result.current[1]({ compact: true }));
    expect(result.current[0]).toEqual({ compact: true });
    expect(JSON.parse(localStorage.getItem('prefs')!)).toEqual({ compact: true });
  });

  it('reads an existing stored value, including falsy JSON values', () => {
    localStorage.setItem('count', '0');
    localStorage.setItem('name', JSON.stringify('Ada'));
    const { result: count } = renderHook(() => impl.useLocalStorage('count', 10));
    const { result: name } = renderHook(() => impl.useLocalStorage('name', ''));
    expect(count.current[0]).toBe(0);
    expect(name.current[0]).toBe('Ada');
  });

  it('falls back to initialValue on invalid JSON', () => {
    localStorage.setItem('broken', '{not json');
    const { result } = renderHook(() => impl.useLocalStorage('broken', 'fallback'));
    expect(result.current[0]).toBe('fallback');
  });

  it('supports functional updates in a row', () => {
    const { result } = renderHook(() => impl.useLocalStorage('n', 0));
    act(() => {
      result.current[1]((n) => n + 1);
      result.current[1]((n) => n + 1);
    });
    expect(result.current[0]).toBe(2);
    expect(localStorage.getItem('n')).toBe('2');
  });

  it('remove() deletes the key and resets to initialValue', () => {
    const { result } = renderHook(() => impl.useLocalStorage('tags', ['a']));
    act(() => result.current[1](['a', 'b']));
    expect(localStorage.getItem('tags')).not.toBeNull();
    act(() => result.current[2]());
    expect(localStorage.getItem('tags')).toBeNull();
    expect(result.current[0]).toEqual(['a']);
  });
});

describeTask('useClickOutside', () => {
  function Box({ onOutside }: { onOutside: (event: Event) => void }) {
    const { useClickOutside } = impl;
    const ref = useRef<HTMLDivElement>(null);
    useClickOutside(ref, onOutside);
    return (
      <div>
        <div ref={ref}>
          <button>Inside</button>
        </div>
        <button>Outside</button>
      </div>
    );
  }

  it('calls the handler for presses outside, not inside', async () => {
    const user = userEvent.setup();
    const handler = vi.fn();
    render(<Box onOutside={handler} />);
    await user.click(screen.getByRole('button', { name: 'Inside' }));
    expect(handler).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Outside' }));
    expect(handler).toHaveBeenCalled();
    expect(handler.mock.calls[0][0]).toBeInstanceOf(Event);
  });

  it('always calls the latest handler', async () => {
    const user = userEvent.setup();
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = render(<Box onOutside={first} />);
    rerender(<Box onOutside={second} />);
    await user.click(screen.getByRole('button', { name: 'Outside' }));
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalled();
  });

  it('stops listening after unmount', async () => {
    const user = userEvent.setup();
    const handler = vi.fn();
    const { unmount } = render(<Box onOutside={handler} />);
    unmount();
    await user.click(document.body);
    expect(handler).not.toHaveBeenCalled();
  });
});

describeTask('useDebounce', () => {
  it('returns the initial value immediately and the latest value after the delay', () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(({ v }) => impl.useDebounce(v, 300), { initialProps: { v: 'a' } });
    expect(result.current).toBe('a');
    rerender({ v: 'ab' });
    expect(result.current).toBe('a');
    act(() => vi.advanceTimersByTime(299));
    expect(result.current).toBe('a');
    act(() => vi.advanceTimersByTime(1));
    expect(result.current).toBe('ab');
  });

  it('restarts the wait on every change', () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(({ v }) => impl.useDebounce(v, 300), { initialProps: { v: 1 } });
    rerender({ v: 2 });
    act(() => vi.advanceTimersByTime(200));
    rerender({ v: 3 });
    act(() => vi.advanceTimersByTime(200));
    expect(result.current).toBe(1);
    act(() => vi.advanceTimersByTime(100));
    expect(result.current).toBe(3);
  });
});

describeFollowUp(1, 'useLocalStorage syncs across tabs', () => {
  it('updates when a storage event for the same key arrives', () => {
    const { result } = renderHook(() => impl.useLocalStorage('theme', 'light'));
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: 'theme', newValue: JSON.stringify('dark') }));
    });
    expect(result.current[0]).toBe('dark');
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: 'other', newValue: JSON.stringify('x') }));
    });
    expect(result.current[0]).toBe('dark');
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: 'theme', newValue: null }));
    });
    expect(result.current[0]).toBe('light');
  });
});
