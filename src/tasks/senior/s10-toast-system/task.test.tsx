// ⚠ Unverified: written before the reference solution. If a test looks wrong, trust the README.
import { act, render, renderHook, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { pickTarget } from '../../../test/target';
import * as Reference from './Reference';
import * as Solution from './Solution';
import type { ToastApi, ToastOptions, ToastProviderProps } from './types';

const { impl, describeTask } = pickTarget(Solution, Reference);
const { ToastProvider } = impl;

let api: ToastApi;
function Capture() {
  api = impl.useToast();
  return null;
}

function setup(props: Omit<ToastProviderProps, 'children'> = {}) {
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  const utils = render(
    <ToastProvider {...props}>
      <Capture />
    </ToastProvider>,
  );
  return { user, ...utils };
}

function show(options: ToastOptions): string {
  let id = '';
  act(() => {
    id = api.show(options);
  });
  return id;
}

const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms));

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});
afterEach(() => {
  vi.useRealTimers();
});

describeTask('Toast system', () => {
  it('renders a polite live region in a portal before any toast is shown', () => {
    const { container } = setup();
    const region = screen.getByRole('region', { name: 'Notifications' });
    expect(region).toHaveAttribute('aria-live', 'polite');
    expect(container).not.toContainElement(region);
    expect(document.body).toContainElement(region);
  });

  it('shows a status toast with its message and returns unique ids', () => {
    setup();
    const a = show({ message: 'Saved', type: 'success' });
    const b = show({ message: 'Synced' });
    expect(a).toEqual(expect.any(String));
    expect(a).not.toBe(b);
    const toasts = screen.getAllByRole('status');
    expect(toasts).toHaveLength(2);
    expect(toasts[0]).toHaveTextContent('Saved');
    expect(toasts[1]).toHaveTextContent('Synced');
    expect(screen.getByRole('region', { name: 'Notifications' })).toContainElement(toasts[0]);
  });

  it('uses role="alert" for error toasts', () => {
    setup();
    show({ message: 'Upload failed', type: 'error' });
    expect(screen.getByRole('alert')).toHaveTextContent('Upload failed');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('auto-dismisses after the default duration of 5000ms', () => {
    setup();
    show({ message: 'Saved' });
    advance(4800);
    expect(screen.getByText('Saved')).toBeInTheDocument();
    advance(400);
    expect(screen.queryByText('Saved')).not.toBeInTheDocument();
  });

  it('honours a custom duration, and duration 0 is sticky', () => {
    setup({ defaultDuration: 2000 });
    show({ message: 'Quick', duration: 1000 });
    show({ message: 'Default' });
    show({ message: 'Sticky', duration: 0 });
    advance(1200);
    expect(screen.queryByText('Quick')).not.toBeInTheDocument();
    expect(screen.getByText('Default')).toBeInTheDocument();
    advance(1000);
    expect(screen.queryByText('Default')).not.toBeInTheDocument();
    advance(60_000);
    expect(screen.getByText('Sticky')).toBeInTheDocument();
  });

  it('removes a toast with its Dismiss button', async () => {
    const { user } = setup();
    show({ message: 'First', duration: 0 });
    show({ message: 'Second', duration: 0 });
    const first = screen.getByText('First').closest('[role="status"]') as HTMLElement;
    await user.click(within(first).getByRole('button', { name: 'Dismiss' }));
    expect(screen.queryByText('First')).not.toBeInTheDocument();
    expect(screen.getByText('Second')).toBeInTheDocument();
  });

  it('removes a toast with dismiss(id) and ignores unknown ids', () => {
    setup();
    const id = show({ message: 'Bye', duration: 0 });
    show({ message: 'Stay', duration: 0 });
    act(() => api.dismiss('does-not-exist'));
    expect(screen.getAllByRole('status')).toHaveLength(2);
    act(() => api.dismiss(id));
    expect(screen.queryByText('Bye')).not.toBeInTheDocument();
    expect(screen.getByText('Stay')).toBeInTheDocument();
  });

  it('pauses on hover and resumes with the remaining time', async () => {
    const { user } = setup();
    show({ message: 'Hover me', duration: 3000 });
    advance(1000);
    await user.hover(screen.getByRole('status'));
    advance(10_000);
    expect(screen.getByText('Hover me')).toBeInTheDocument();
    await user.unhover(screen.getByRole('status'));
    advance(1700);
    expect(screen.getByText('Hover me')).toBeInTheDocument();
    advance(500);
    expect(screen.queryByText('Hover me')).not.toBeInTheDocument();
  });

  it('limits visible toasts and shows queued ones in order as space frees up', () => {
    setup({ maxVisible: 2 });
    const a = show({ message: 'Toast A', duration: 0 });
    show({ message: 'Toast B', duration: 0 });
    show({ message: 'Toast C', duration: 0 });
    show({ message: 'Toast D', duration: 0 });
    expect(screen.getAllByRole('status')).toHaveLength(2);
    expect(screen.queryByText('Toast C')).not.toBeInTheDocument();
    act(() => api.dismiss(a));
    const visible = screen.getAllByRole('status');
    expect(visible).toHaveLength(2);
    expect(visible[0]).toHaveTextContent('Toast B');
    expect(visible[1]).toHaveTextContent('Toast C');
    expect(screen.queryByText('Toast D')).not.toBeInTheDocument();
  });

  it("starts a queued toast's timer only when it becomes visible", () => {
    setup({ maxVisible: 1 });
    show({ message: 'Toast A', duration: 1000 });
    show({ message: 'Toast B', duration: 1000 });
    advance(1100);
    expect(screen.queryByText('Toast A')).not.toBeInTheDocument();
    expect(screen.getByText('Toast B')).toBeInTheDocument();
    advance(700);
    expect(screen.getByText('Toast B')).toBeInTheDocument();
    advance(400);
    expect(screen.queryByText('Toast B')).not.toBeInTheDocument();
  });

  it('never shows a queued toast that was dismissed', () => {
    setup({ maxVisible: 1 });
    const a = show({ message: 'Toast A', duration: 0 });
    const b = show({ message: 'Toast B', duration: 0 });
    show({ message: 'Toast C', duration: 0 });
    act(() => api.dismiss(b));
    act(() => api.dismiss(a));
    expect(screen.queryByText('Toast B')).not.toBeInTheDocument();
    expect(screen.getByText('Toast C')).toBeInTheDocument();
  });

  it('keeps show/dismiss stable and throws outside a provider', () => {
    const { result } = renderHook(() => impl.useToast(), { wrapper: ToastProvider });
    const first = result.current;
    act(() => {
      first.show({ message: 'Stable?' });
    });
    expect(result.current.show).toBe(first.show);
    expect(result.current.dismiss).toBe(first.dismiss);

    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => impl.useToast())).toThrow();
    spy.mockRestore();
  });
});
