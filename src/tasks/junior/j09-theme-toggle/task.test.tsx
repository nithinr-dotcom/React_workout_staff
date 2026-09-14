// ⚠ Unverified: written before the reference solution. If a test looks wrong, trust the README.
import { act, render, renderHook, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { pickTarget } from '../../../test/target';
import * as Reference from './Reference';
import * as Solution from './Solution';
import type { ThemeToggleModule } from './types';

const { impl: rawImpl, describeTask } = pickTarget(Solution, Reference);
const impl = rawImpl as unknown as ThemeToggleModule;

/** A controllable stand-in for window.matchMedia('(prefers-color-scheme: dark)'). */
function installMatchMedia(initialDark: boolean) {
  let dark = initialDark;
  const listeners = new Set<(e: MediaQueryListEvent) => void>();
  const make = (query: string) =>
    ({
      get matches() {
        return query.includes('dark') ? dark : !dark;
      },
      media: query,
      onchange: null,
      addEventListener: (_type: string, cb: (e: MediaQueryListEvent) => void) => listeners.add(cb),
      removeEventListener: (_type: string, cb: (e: MediaQueryListEvent) => void) => listeners.delete(cb),
      addListener: (cb: (e: MediaQueryListEvent) => void) => listeners.add(cb),
      removeListener: (cb: (e: MediaQueryListEvent) => void) => listeners.delete(cb),
      dispatchEvent: () => true,
    }) as unknown as MediaQueryList;
  vi.spyOn(window, 'matchMedia').mockImplementation(make);
  return {
    setDark(next: boolean) {
      dark = next;
      act(() => {
        for (const cb of [...listeners]) cb({ matches: next, media: '(prefers-color-scheme: dark)' } as MediaQueryListEvent);
      });
    },
    listenerCount: () => listeners.size,
  };
}

const htmlTheme = () => document.documentElement.getAttribute('data-theme');

function renderToggle(props: { defaultTheme?: 'light' | 'dark' | 'system'; storageKey?: string } = {}) {
  const { ThemeProvider, default: ThemeToggle } = impl;
  return render(
    <ThemeProvider {...props}>
      <ThemeToggle />
    </ThemeProvider>,
  );
}

beforeEach(() => {
  document.documentElement.removeAttribute('data-theme');
});
afterEach(() => {
  vi.restoreAllMocks();
  document.documentElement.removeAttribute('data-theme');
});

describeTask('ThemeProvider + ThemeToggle', () => {
  it('defaults to "system" and resolves to light when the OS is light', () => {
    installMatchMedia(false);
    renderToggle();
    expect(screen.getByRole('radio', { name: 'System' })).toBeChecked();
    expect(htmlTheme()).toBe('light');
  });

  it('resolves "system" to dark when the OS prefers dark', () => {
    installMatchMedia(true);
    renderToggle();
    expect(htmlTheme()).toBe('dark');
  });

  it('selecting Dark applies and persists the preference', async () => {
    installMatchMedia(false);
    const user = userEvent.setup();
    renderToggle();
    await user.click(screen.getByRole('radio', { name: 'Dark' }));
    expect(screen.getByRole('radio', { name: 'Dark' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'System' })).not.toBeChecked();
    expect(htmlTheme()).toBe('dark');
    expect(localStorage.getItem('theme')).toBe('dark');
  });

  it('reads the stored preference on mount', () => {
    installMatchMedia(true);
    localStorage.setItem('theme', 'light');
    renderToggle();
    expect(screen.getByRole('radio', { name: 'Light' })).toBeChecked();
    expect(htmlTheme()).toBe('light');
  });

  it('falls back to defaultTheme when the stored value is invalid', () => {
    installMatchMedia(false);
    localStorage.setItem('theme', 'blue');
    renderToggle({ defaultTheme: 'dark' });
    expect(screen.getByRole('radio', { name: 'Dark' })).toBeChecked();
    expect(htmlTheme()).toBe('dark');
  });

  it('uses a custom storageKey', async () => {
    installMatchMedia(false);
    const user = userEvent.setup();
    localStorage.setItem('my-theme', 'dark');
    renderToggle({ storageKey: 'my-theme' });
    expect(htmlTheme()).toBe('dark');
    await user.click(screen.getByRole('radio', { name: 'Light' }));
    expect(localStorage.getItem('my-theme')).toBe('light');
  });

  it('follows OS changes while on "system", but not on an explicit theme', async () => {
    const media = installMatchMedia(false);
    const user = userEvent.setup();
    renderToggle();
    expect(htmlTheme()).toBe('light');
    media.setDark(true);
    expect(htmlTheme()).toBe('dark');

    await user.click(screen.getByRole('radio', { name: 'Light' }));
    expect(htmlTheme()).toBe('light');
    media.setDark(false);
    media.setDark(true);
    expect(htmlTheme()).toBe('light');
  });

  it('re-reads the OS value when switching back to "system"', async () => {
    const media = installMatchMedia(false);
    const user = userEvent.setup();
    renderToggle({ defaultTheme: 'light' });
    media.setDark(true);
    expect(htmlTheme()).toBe('light');
    await user.click(screen.getByRole('radio', { name: 'System' }));
    expect(htmlTheme()).toBe('dark');
  });

  it('removes its media query listener on unmount', () => {
    const media = installMatchMedia(false);
    const { unmount } = renderToggle();
    unmount();
    expect(media.listenerCount()).toBe(0);
  });

  it('useTheme exposes theme, resolvedTheme and setTheme', () => {
    installMatchMedia(true);
    const { result } = renderHook(() => impl.useTheme(), { wrapper: impl.ThemeProvider });
    expect(result.current.theme).toBe('system');
    expect(result.current.resolvedTheme).toBe('dark');
    act(() => result.current.setTheme('light'));
    expect(result.current.theme).toBe('light');
    expect(result.current.resolvedTheme).toBe('light');
  });

  it('useTheme throws outside a ThemeProvider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => impl.useTheme())).toThrow();
  });
});
