// ⚠ Unverified: written before the reference solution. If a test looks wrong, trust the README.
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { pickTarget } from '../../../test/target';
import * as Reference from './Reference';
import * as Solution from './Solution';
import type { KeyValueStorage, Plugin, PluginContext } from './types';

const { impl, describeTask } = pickTarget(Solution, Reference);
const PluginShell = impl.default;

function memoryStorage(): KeyValueStorage {
  const map = new Map<string, string>();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => void map.set(key, value),
    removeItem: (key) => void map.delete(key),
  };
}

function plugin(id: string, activate: Plugin['activate'], extra: Partial<Plugin> = {}): Plugin {
  return { id, version: '1.0.0', engines: '^1.0.0', activate, ...extra };
}

function setup(hostVersion = '1.4.2') {
  const onError = vi.fn();
  const storage = memoryStorage();
  const host = impl.createPluginHost({ hostVersion, storage, onError });
  return { host, onError, storage };
}

describeTask('Plugin host & shell', () => {
  it('renders toolbar contributions from plugins activated after the shell mounts', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    const { host } = setup();
    host.register(
      plugin('hello', (ctx) => {
        ctx.contribute('toolbar', { id: 'wave', label: 'Wave', onClick });
      }),
    );
    render(<PluginShell host={host} />);
    expect(screen.getByRole('toolbar', { name: 'Plugin toolbar' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Wave' })).not.toBeInTheDocument();

    await act(async () => {
      expect(await host.activate('hello')).toBe('active');
    });
    const toolbar = screen.getByRole('toolbar', { name: 'Plugin toolbar' });
    await user.click(within(toolbar).getByRole('button', { name: 'Wave' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('loads lazy plugins only on activate, and only once for concurrent activations', async () => {
    const { host } = setup();
    const activate = vi.fn();
    const load = vi.fn(async () => ({ default: plugin('lazy', activate) }));
    host.register({ id: 'lazy', load });
    expect(load).not.toHaveBeenCalled();
    expect(host.getStatus('lazy')).toBe('registered');

    const results = await Promise.all([host.activate('lazy'), host.activate('lazy')]);
    expect(results).toEqual(['active', 'active']);
    expect(load).toHaveBeenCalledTimes(1);
    expect(activate).toHaveBeenCalledTimes(1);
  });

  it('checks engine compatibility with the caret rule and refuses incompatible plugins', async () => {
    expect(impl.satisfiesEngine('1.4.2', '^1.2.0')).toBe(true);
    expect(impl.satisfiesEngine('1.4.2', '^1.4.2')).toBe(true);
    expect(impl.satisfiesEngine('1.4.2', '^1.4.3')).toBe(false);
    expect(impl.satisfiesEngine('1.4.2', '^1.5.0')).toBe(false);
    expect(impl.satisfiesEngine('2.0.0', '^1.2.0')).toBe(false);

    const { host } = setup('1.4.2');
    const activate = vi.fn();
    host.register(plugin('future', activate, { engines: '^2.0.0' }));
    expect(await host.activate('future')).toBe('incompatible');
    expect(activate).not.toHaveBeenCalled();
    expect(host.getStatus('future')).toBe('incompatible');
  });

  it('marks a throwing plugin as failed, rolls back its contributions, and keeps others working', async () => {
    const { host, onError } = setup();
    host.register(
      plugin('bad', (ctx) => {
        ctx.contribute('toolbar', { id: 'half', label: 'Half', onClick: () => {} });
        throw new Error('kaboom');
      }),
    );
    host.register(
      plugin('good', (ctx) => {
        ctx.contribute('commands', { id: 'hi', title: 'Say hi', run: () => {} });
      }),
    );
    await expect(host.activate('bad')).resolves.toBe('failed');
    expect(await host.activate('good')).toBe('active');
    expect(onError).toHaveBeenCalledWith(expect.any(Error), 'bad');
    expect(host.getContributions('toolbar')).toHaveLength(0);
    expect(host.getContributions('commands').map((c) => [c.title, c.pluginId])).toEqual([['Say hi', 'good']]);
  });

  it('isolates a crashing panel behind its own error boundary', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { host, onError } = setup();
    const Broken = () => {
      throw new Error('render fail');
    };
    host.register(
      plugin('broken', (ctx) => {
        ctx.contribute('sidebarPanels', { id: 'b', title: 'Broken', component: Broken });
      }),
    );
    host.register(
      plugin('notes', (ctx) => {
        ctx.contribute('sidebarPanels', { id: 'n', title: 'Notes', component: () => <p>All good</p> });
        ctx.contribute('toolbar', { id: 't', label: 'Still here', onClick: () => {} });
      }),
    );
    await host.activate('broken');
    await host.activate('notes');

    render(<PluginShell host={host} />);
    expect(within(screen.getByRole('region', { name: 'Broken' })).getByText('This panel crashed.')).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Notes' })).getByText('All good')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Still here' })).toBeInTheDocument();
    expect(onError).toHaveBeenCalledWith(expect.any(Error), 'broken');
  });

  it('namespaces plugin storage and persists it through the injected storage', async () => {
    const { host, storage } = setup();
    let a!: PluginContext;
    let b!: PluginContext;
    host.register(plugin('a', (ctx) => void (a = ctx)));
    host.register(plugin('b', (ctx) => void (b = ctx)));
    await host.activate('a');
    await host.activate('b');

    a.storage.set('theme', 'dark');
    b.storage.set('theme', 'light');
    a.storage.set('prefs', { size: 3 });
    expect(a.storage.get('theme')).toBe('dark');
    expect(b.storage.get('theme')).toBe('light');
    expect(a.storage.get('missing')).toBeUndefined();

    const host2 = impl.createPluginHost({ hostVersion: '1.4.2', storage, onError: vi.fn() });
    let a2!: PluginContext;
    host2.register(plugin('a', (ctx) => void (a2 = ctx)));
    await host2.activate('a');
    expect(a2.storage.get('theme')).toBe('dark');
    expect(a2.storage.get('prefs')).toEqual({ size: 3 });
  });

  it('delivers events between plugins and isolates a throwing handler', async () => {
    const { host, onError } = setup();
    const received = vi.fn();
    let emitter!: PluginContext;
    host.register(
      plugin('buggy', (ctx) => {
        ctx.events.on('doc:saved', () => {
          throw new Error('listener bug');
        });
      }),
    );
    host.register(plugin('listener', (ctx) => void ctx.events.on('doc:saved', received)));
    host.register(plugin('emitter', (ctx) => void (emitter = ctx)));
    for (const id of ['buggy', 'listener', 'emitter']) await host.activate(id);

    emitter.events.emit('doc:saved', { id: 7 });
    expect(received).toHaveBeenCalledWith({ id: 7 });
    expect(onError).toHaveBeenCalledWith(expect.any(Error), 'buggy');
  });

  it('deactivate cleans up contributions, listeners and disposables, and can re-activate', async () => {
    const { host } = setup();
    const cleanup = vi.fn();
    const onDeactivate = vi.fn();
    const received = vi.fn();
    let pinger!: PluginContext;
    host.register(
      plugin(
        'temp',
        (ctx) => {
          ctx.contribute('toolbar', { id: 'x', label: 'Temporary', onClick: () => {} });
          ctx.events.on('ping', received);
          ctx.onDispose(cleanup);
        },
        { deactivate: onDeactivate },
      ),
    );
    host.register(plugin('pinger', (ctx) => void (pinger = ctx)));
    render(<PluginShell host={host} />);
    await act(async () => {
      await host.activate('temp');
      await host.activate('pinger');
    });
    expect(screen.getByRole('button', { name: 'Temporary' })).toBeInTheDocument();

    act(() => host.deactivate('temp'));
    expect(screen.queryByRole('button', { name: 'Temporary' })).not.toBeInTheDocument();
    expect(host.getStatus('temp')).toBe('inactive');
    expect(onDeactivate).toHaveBeenCalledTimes(1);
    expect(cleanup).toHaveBeenCalledTimes(1);
    pinger.events.emit('ping');
    expect(received).not.toHaveBeenCalled();

    await act(async () => {
      expect(await host.activate('temp')).toBe('active');
    });
    expect(screen.getByRole('button', { name: 'Temporary' })).toBeInTheDocument();
  });
});
