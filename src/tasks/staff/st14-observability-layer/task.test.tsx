// ⚠ Unverified: written before the reference solution. If a test looks wrong, trust the README.
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { pickTarget } from '../../../test/target';
import * as Reference from './Reference';
import * as Solution from './Solution';
import type { ObsErrorEvent, ObsEvent, ObservabilityOptions, ObsTrackEvent, Transport } from './types';

const { impl, describeTask } = pickTarget(Solution, Reference);

function setup(options: Partial<ObservabilityOptions> = {}) {
  const transport = vi.fn<Transport>();
  const client = impl.createObservability({ transport, flushAt: 100, flushIntervalMs: 60_000, ...options });
  const sent = (): ObsEvent[] => transport.mock.calls.flatMap(([events]) => events);
  const errors = () => sent().filter((e): e is ObsErrorEvent => e.type === 'error');
  const tracks = () => sent().filter((e): e is ObsTrackEvent => e.type === 'track');
  return { client, transport, sent, errors, tracks };
}

function Bomb({ explode }: { explode: boolean }) {
  if (explode) throw new Error('Render exploded');
  return <p>Safe content</p>;
}

describeTask('Observability client', () => {
  it('flushes one batch when the buffer reaches flushAt', async () => {
    const { client, transport, tracks } = setup({ flushAt: 3 });
    client.track('a');
    client.track('b');
    await Promise.resolve();
    expect(transport).not.toHaveBeenCalled();
    client.track('c', { plan: 'pro' });
    await waitFor(() => expect(transport).toHaveBeenCalledTimes(1));
    expect(tracks().map((e) => e.name)).toEqual(['a', 'b', 'c']);
    expect(tracks()[2].properties).toEqual({ plan: 'pro' });
  });

  it('flushes buffered events after flushIntervalMs and skips empty flushes', async () => {
    vi.useFakeTimers();
    const { client, transport, tracks } = setup({ flushIntervalMs: 1000 });
    client.track('first');
    await vi.advanceTimersByTimeAsync(500);
    client.track('second');
    await vi.advanceTimersByTimeAsync(499);
    expect(transport).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(transport).toHaveBeenCalledTimes(1);
    expect(tracks().map((e) => e.name)).toEqual(['first', 'second']);

    await vi.advanceTimersByTimeAsync(5000);
    await client.flush();
    expect(transport).toHaveBeenCalledTimes(1);
  });

  it('dedupes identical errors still in the buffer into one event with a count', async () => {
    const { client, errors } = setup();
    const same = new Error('Same failure');
    client.captureError(same);
    client.captureError(same);
    client.captureError(same);
    client.captureError(new Error('Other failure'));
    await client.flush();
    expect(errors()).toHaveLength(2);
    expect(errors().find((e) => e.message === 'Same failure')).toMatchObject({ count: 3, source: 'manual' });
    expect(errors().find((e) => e.message === 'Other failure')?.count).toBe(1);

    client.captureError(same);
    await client.flush();
    expect(errors()).toHaveLength(3);
  });

  it('samples track events with the injected random, but never errors', async () => {
    const randoms = [0.1, 0.9, 0.4];
    const { client, tracks, errors } = setup({ sampleRate: 0.5, random: () => randoms.shift() ?? 0.99 });
    client.track('kept-1');
    client.track('dropped');
    client.track('kept-2');
    client.captureError(new Error('never sampled out'));
    await client.flush();
    expect(tracks().map((e) => e.name)).toEqual(['kept-1', 'kept-2']);
    expect(errors()).toHaveLength(1);
  });

  it('keeps a bounded breadcrumb ring buffer and snapshots it into errors', async () => {
    const { client, errors } = setup({ maxBreadcrumbs: 3 });
    for (const message of ['c1', 'c2', 'c3', 'c4', 'c5']) client.addBreadcrumb({ type: 'custom', message });
    client.captureError(new Error('with crumbs'));
    client.addBreadcrumb({ type: 'custom', message: 'after capture' });
    await client.flush();
    const [error] = errors();
    expect(error.breadcrumbs.map((b) => b.message)).toEqual(['c3', 'c4', 'c5']);
    expect(typeof error.breadcrumbs[0].timestamp).toBe('number');
  });

  it('scrubs PII: scrubPII is pure, is the default scrubber, and custom scrub can drop events', async () => {
    const input = {
      user: { email: 'ada@example.com', password: 'hunter2', note: 'contact ada@example.com now' },
      accessToken: 'abc123',
      tags: ['x@y.io', 42, null, true],
    };
    expect(impl.scrubPII(input)).toEqual({
      user: { email: '[email]', password: '[redacted]', note: 'contact [email] now' },
      accessToken: '[redacted]',
      tags: ['[email]', 42, null, true],
    });
    expect(input.user.password).toBe('hunter2');

    const byDefault = setup();
    byDefault.client.track('signup', { email: 'ada@example.com', plan: 'pro' });
    await byDefault.client.flush();
    expect(byDefault.tracks()[0].properties).toEqual({ email: '[email]', plan: 'pro' });

    const custom = setup({ scrub: (e) => (e.type === 'track' && e.name === 'internal' ? null : e) });
    custom.client.track('internal');
    custom.client.track('public');
    await custom.client.flush();
    expect(custom.tracks().map((e) => e.name)).toEqual(['public']);
  });
});

describeTask('React bindings', () => {
  it('ErrorBoundary renders the fallback, reports with a component stack, and resets on resetKeys change', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { client, errors } = setup();
    const onReset = vi.fn();
    const ui = (explode: boolean) => (
      <impl.ObservabilityProvider client={client}>
        <impl.ErrorBoundary
          resetKeys={[explode]}
          onReset={onReset}
          fallback={({ error }) => <p role="alert">Something broke: {error.message}</p>}
        >
          <Bomb explode={explode} />
        </impl.ErrorBoundary>
      </impl.ObservabilityProvider>
    );
    const { rerender } = render(ui(true));
    expect(screen.getByRole('alert')).toHaveTextContent('Something broke: Render exploded');

    await client.flush();
    const event = errors().find((e) => e.message === 'Render exploded');
    expect(event?.source).toBe('boundary');
    expect(typeof event?.componentStack).toBe('string');
    expect(event?.componentStack?.length).toBeGreaterThan(0);

    rerender(ui(false));
    expect(screen.getByText('Safe content')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it('ErrorBoundary works without a provider and recovers via reset()', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const user = userEvent.setup();
    let shouldThrow = true;
    function Flaky() {
      if (shouldThrow) throw new Error('Flaky');
      return <p>Recovered</p>;
    }
    const onReset = vi.fn();
    render(
      <>
        <impl.ErrorBoundary fallback={<p>Static fallback</p>}>
          <Bomb explode />
        </impl.ErrorBoundary>
        <impl.ErrorBoundary onReset={onReset} fallback={({ reset }) => <button onClick={reset}>Try again</button>}>
          <Flaky />
        </impl.ErrorBoundary>
      </>,
    );
    expect(screen.getByText('Static fallback')).toBeInTheDocument();
    shouldThrow = false;
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(screen.getByText('Recovered')).toBeInTheDocument();
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it('captures window errors and unhandled rejections while mounted, and stops after unmount', async () => {
    const { client, errors } = setup();
    const { unmount } = render(
      <impl.ObservabilityProvider client={client}>
        <p>app</p>
      </impl.ObservabilityProvider>,
    );
    act(() => {
      window.dispatchEvent(new ErrorEvent('error', { error: new Error('Global boom'), message: 'Global boom' }));
      window.dispatchEvent(Object.assign(new Event('unhandledrejection'), { reason: new Error('Rejected boom') }));
    });
    await client.flush();
    expect(errors().find((e) => e.message === 'Global boom')?.source).toBe('window.error');
    expect(errors().find((e) => e.message === 'Rejected boom')?.source).toBe('unhandledrejection');

    unmount();
    // No `error` property: with no listeners left, the test runner would otherwise treat it as uncaught.
    window.dispatchEvent(new ErrorEvent('error', { message: 'After unmount' }));
    window.dispatchEvent(Object.assign(new Event('unhandledrejection'), { reason: new Error('Rejected after unmount') }));
    await client.flush();
    expect(errors().map((e) => e.message)).not.toContain('After unmount');
    expect(errors().map((e) => e.message)).not.toContain('Rejected after unmount');
  });

  it('records click breadcrumbs, tracks via useTrackEvent, and flushes on pagehide', async () => {
    const user = userEvent.setup();
    const { client, transport, tracks, errors } = setup();
    function SaveButton() {
      const track = impl.useTrackEvent();
      return <button onClick={() => track('save_clicked', { draft: true })}>Save</button>;
    }
    render(
      <impl.ObservabilityProvider client={client}>
        <SaveButton />
      </impl.ObservabilityProvider>,
    );
    await user.click(screen.getByRole('button', { name: 'Save' }));
    client.captureError(new Error('after click'));
    expect(transport).not.toHaveBeenCalled();

    act(() => {
      window.dispatchEvent(new Event('pagehide'));
    });
    await waitFor(() => expect(transport).toHaveBeenCalled());
    expect(tracks().find((e) => e.name === 'save_clicked')?.properties).toEqual({ draft: true });
    const crumbs = errors().find((e) => e.message === 'after click')?.breadcrumbs ?? [];
    expect(crumbs.some((b) => b.type === 'click' && b.message.includes('Save'))).toBe(true);
  });
});
