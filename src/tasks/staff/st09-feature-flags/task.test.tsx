// ⚠ Unverified: written before the reference solution. If a test looks wrong, trust the README.
import { act, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { pickTarget } from '../../../test/target';
import * as Reference from './Reference';
import * as Solution from './Solution';
import type { FlagClient, FlagDefinition, FlagSnapshot, FlagUser } from './types';

const { impl, describeTask } = pickTarget(Solution, Reference);

function fakeClient(initial: FlagSnapshot) {
  let snapshot = initial;
  const listeners = new Set<() => void>();
  const client = {
    getSnapshot: () => snapshot,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    identify: vi.fn(async (_user: FlagUser) => {}),
    emit(next: FlagSnapshot) {
      snapshot = next;
      listeners.forEach((l) => l());
    },
  } satisfies FlagClient & { emit(next: FlagSnapshot): void };
  return client;
}

const checkout: FlagDefinition = {
  key: 'new-checkout',
  rules: [
    { conditions: [{ attribute: 'employee', op: 'eq', value: true }], value: 'employee' },
    { conditions: [{ attribute: 'country', op: 'in', values: ['IN', 'JP'] }], value: 'apac' },
    { conditions: [{ attribute: 'country', op: 'eq', value: 'IN' }], value: 'unreachable-for-IN' },
  ],
  defaultValue: 'control',
};

describeTask('Feature flags', () => {
  it('evaluateFlag: matches eq / in conditions in order, first applicable rule wins', () => {
    expect(impl.evaluateFlag(checkout, { id: 'a', attributes: { country: 'IN', employee: true } })).toBe('employee');
    expect(impl.evaluateFlag(checkout, { id: 'b', attributes: { country: 'IN' } })).toBe('apac');
    expect(impl.evaluateFlag(checkout, { id: 'c', attributes: { country: 'JP', employee: false } })).toBe('apac');
    expect(impl.evaluateFlag(checkout, { id: 'd', attributes: { country: 'US' } })).toBe('control');
    expect(impl.evaluateFlag(checkout, { id: 'e' })).toBe('control');
    expect(impl.evaluateFlag({ ...checkout, enabled: false }, { id: 'a', attributes: { employee: true } })).toBe('control');
  });

  it('getBucket is a deterministic integer in [0, 99]', () => {
    for (let i = 0; i < 500; i++) {
      const b = impl.getBucket('some-flag', `user-${i}`);
      expect(Number.isInteger(b)).toBe(true);
      expect(b).toBeGreaterThanOrEqual(0);
      expect(b).toBeLessThanOrEqual(99);
      expect(impl.getBucket('some-flag', `user-${i}`)).toBe(b);
    }
  });

  it('percentage rollouts are stable, consistent with getBucket and roughly uniform', () => {
    const flag: FlagDefinition = { key: 'rollout', rules: [{ percentage: 30, value: true }], defaultValue: false };
    let on = 0;
    for (let i = 0; i < 10_000; i++) {
      const user = { id: `user-${i}` };
      const value = impl.evaluateFlag(flag, user);
      if (value === true) on++;
      if (i < 300) {
        expect(value).toBe(impl.getBucket('rollout', user.id) < 30);
        expect(impl.evaluateFlag(flag, user)).toBe(value);
      }
    }
    expect(on).toBeGreaterThan(2500);
    expect(on).toBeLessThan(3500);
    // Anonymous users are never inside a percentage rollout.
    expect(impl.evaluateFlag(flag, {})).toBe(false);
  });

  it('client: bootstrap first, then evaluated definitions after identify, then live pushes', async () => {
    const definitions: FlagDefinition[] = [
      { key: 'new-checkout', rules: [{ conditions: [{ attribute: 'country', op: 'eq', value: 'IN' }], value: true }], defaultValue: false },
    ];
    const fetchFlags = vi.fn(async (_user: FlagUser, _options: { signal: AbortSignal }) => definitions);
    let push: ((defs: FlagDefinition[]) => void) | undefined;
    const client = impl.createFlagClient({
      bootstrap: { 'new-checkout': true },
      fetchFlags,
      connect: (p) => {
        push = p;
        return () => {};
      },
    });

    expect(client.getSnapshot()).toEqual({ 'new-checkout': true });
    expect(client.getSnapshot()).toBe(client.getSnapshot());

    const listener = vi.fn();
    client.subscribe(listener);
    const user = { id: 'u1', attributes: { country: 'US' } };
    await client.identify(user);

    expect(fetchFlags).toHaveBeenCalledTimes(1);
    expect(fetchFlags.mock.calls[0][0]).toEqual(user);
    expect(client.getSnapshot()).toEqual({ 'new-checkout': false });
    expect(listener).toHaveBeenCalled();

    listener.mockClear();
    expect(push).toBeTypeOf('function');
    push!([{ key: 'new-checkout', rules: [], defaultValue: true }]);
    expect(client.getSnapshot()).toEqual({ 'new-checkout': true });
    expect(listener).toHaveBeenCalled();
    client.destroy();
  });

  it('provider: the very first render uses the bootstrapped snapshot (no flicker) and identifies the user', () => {
    const client = fakeClient({ 'new-checkout': true });
    const seen: boolean[] = [];
    function Checkout() {
      const on = impl.useFlag('new-checkout', false);
      seen.push(on);
      return <p>{on ? 'New checkout' : 'Classic checkout'}</p>;
    }
    const user = { id: 'u1' };
    render(
      <impl.FlagProvider client={client} user={user}>
        <Checkout />
      </impl.FlagProvider>,
    );
    expect(seen[0]).toBe(true);
    expect(screen.getByText('New checkout')).toBeInTheDocument();
    expect(client.identify).toHaveBeenCalledWith(user);
  });

  it('useFlag returns the default for missing flags and updates when the client notifies', () => {
    const client = fakeClient({});
    function Page() {
      const variant = impl.useFlag('pricing-variant', 'control');
      const perPage = impl.useFlag('per-page', 20);
      return (
        <p>
          variant={variant} perPage={perPage}
        </p>
      );
    }
    render(
      <impl.FlagProvider client={client} user={{ id: 'u1' }}>
        <Page />
      </impl.FlagProvider>,
    );
    expect(screen.getByText('variant=control perPage=20')).toBeInTheDocument();
    act(() => client.emit({ 'pricing-variant': 'annual-first', 'per-page': 50 }));
    expect(screen.getByText('variant=annual-first perPage=50')).toBeInTheDocument();
  });

  it('<Feature> swaps between children and fallback, including by variant value', () => {
    const client = fakeClient({ 'new-checkout': false, pricing: 'a' });
    render(
      <impl.FlagProvider client={client} user={{ id: 'u1' }}>
        <impl.Feature flag="new-checkout" fallback={<p>Classic</p>}>
          <p>Shiny</p>
        </impl.Feature>
        <impl.Feature flag="pricing" value="b" fallback={<p>Pricing A</p>}>
          <p>Pricing B</p>
        </impl.Feature>
      </impl.FlagProvider>,
    );
    expect(screen.getByText('Classic')).toBeInTheDocument();
    expect(screen.queryByText('Shiny')).not.toBeInTheDocument();
    expect(screen.getByText('Pricing A')).toBeInTheDocument();

    act(() => client.emit({ 'new-checkout': true, pricing: 'b' }));
    expect(screen.getByText('Shiny')).toBeInTheDocument();
    expect(screen.queryByText('Classic')).not.toBeInTheDocument();
    expect(screen.getByText('Pricing B')).toBeInTheDocument();
  });

  it('logs an exposure once per flag + value, across re-renders and multiple readers', () => {
    const client = fakeClient({ 'new-checkout': true });
    const onExposure = vi.fn();
    function Reader({ label }: { label: string }) {
      const on = impl.useFlag('new-checkout', false);
      return (
        <p>
          {label}:{String(on)}
        </p>
      );
    }
    const tree = (n: number) => (
      <impl.FlagProvider client={client} user={{ id: 'u42' }} onExposure={onExposure}>
        <Reader label={`a${n}`} />
        <Reader label={`b${n}`} />
      </impl.FlagProvider>
    );
    const { rerender } = render(tree(1));
    rerender(tree(2));
    rerender(tree(3));
    expect(screen.getByText('a3:true')).toBeInTheDocument();
    expect(onExposure).toHaveBeenCalledTimes(1);
    expect(onExposure).toHaveBeenCalledWith(expect.objectContaining({ flagKey: 'new-checkout', value: true, userId: 'u42' }));
  });
});
