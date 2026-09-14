// ⚠ Unverified: written before the reference solution. If a test looks wrong, trust the README.
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import { pickTarget } from '../../../test/target';
import * as Reference from './Reference';
import * as Solution from './Solution';
import type { NetworkStatus, StorageLike, SyncEngineOptions, Todo } from './types';

const { impl, describeTask } = pickTarget(Solution, Reference);
const OfflineTodos = impl.default;

function memoryStorage(): StorageLike {
  const map = new Map<string, string>();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, String(value));
    },
    removeItem: (key) => {
      map.delete(key);
    },
  };
}

function fakeNetwork(initial: boolean) {
  let online = initial;
  const listeners = new Set<(online: boolean) => void>();
  const network: NetworkStatus & { set(value: boolean): void } = {
    isOnline: () => online,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    set(value) {
      online = value;
      listeners.forEach((l) => l(value));
    },
  };
  return network;
}

function fakeApi() {
  return {
    saveTodo: vi.fn(async (todo: Todo): Promise<Todo> => ({ ...todo })),
    deleteTodo: vi.fn(async (_id: string) => ({ ok: true as const })),
    getTodos: vi.fn(async (): Promise<Todo[]> => []),
  };
}

function setup(online: boolean, overrides: Partial<SyncEngineOptions> = {}) {
  const api = fakeApi();
  const network = fakeNetwork(online);
  const storage = memoryStorage();
  let clock = 1_000;
  let ids = 0;
  const options: SyncEngineOptions = {
    api,
    network,
    storage,
    now: () => (clock += 10),
    generateId: () => `t${++ids}`,
    ...overrides,
  };
  const engine = impl.createSyncEngine(options);
  return { engine, api, network, storage, options };
}

const settle = () => new Promise((r) => setTimeout(r, 20));

afterEach(() => {
  vi.useRealTimers();
});

describeTask('Offline sync engine', () => {
  it('applies writes optimistically and makes no API calls while offline', async () => {
    const { engine, api } = setup(false);
    const listener = vi.fn();
    engine.subscribe(listener);
    const created = engine.add('Buy milk');

    const snap = engine.getSnapshot();
    expect(snap.todos).toHaveLength(1);
    expect(snap.todos[0]).toMatchObject({ id: created.id, title: 'Buy milk', done: false, status: 'pending' });
    expect(snap.online).toBe(false);
    expect(snap.pendingCount).toBeGreaterThanOrEqual(1);
    expect(engine.getSnapshot()).toBe(snap);
    expect(listener).toHaveBeenCalled();

    await settle();
    expect(api.saveTodo).not.toHaveBeenCalled();
  });

  it('replays queued changes in order when the network comes back', async () => {
    const { engine, api, network } = setup(false);
    const a = engine.add('A');
    const b = engine.add('B');
    engine.update(b.id, { done: true });

    network.set(true);
    await vi.waitFor(() => {
      expect(engine.getSnapshot().todos.map((t) => t.status)).toEqual(['synced', 'synced']);
    });

    const savedIds = api.saveTodo.mock.calls.map(([todo]) => todo.id);
    expect(savedIds.indexOf(a.id)).toBeGreaterThanOrEqual(0);
    expect(savedIds.indexOf(a.id)).toBeLessThan(savedIds.indexOf(b.id));
    const lastB = api.saveTodo.mock.calls.filter(([todo]) => todo.id === b.id).at(-1)![0];
    expect(lastB.done).toBe(true);
    expect(engine.getSnapshot().pendingCount).toBe(0);
  });

  it('restores the persisted outbox and todos in a new engine and resumes syncing', async () => {
    const first = setup(false);
    first.engine.add('Persist me');
    first.engine.destroy();

    const network = fakeNetwork(false);
    const api = fakeApi();
    const second = impl.createSyncEngine({ ...first.options, api, network });
    expect(second.getSnapshot().todos).toEqual([expect.objectContaining({ title: 'Persist me', status: 'pending' })]);

    network.set(true);
    await vi.waitFor(() => {
      expect(api.saveTodo).toHaveBeenCalledWith(expect.objectContaining({ title: 'Persist me' }));
      expect(second.getSnapshot().todos[0].status).toBe('synced');
    });
  });

  it('retries with the injected delay and marks the todo failed after maxAttempts', async () => {
    vi.useFakeTimers();
    const { engine, api } = setup(true, { maxAttempts: 3, retryDelay: () => 1000 });
    api.saveTodo.mockRejectedValue(new Error('500'));

    engine.add('Flaky');
    await vi.advanceTimersByTimeAsync(0);
    expect(api.saveTodo).toHaveBeenCalledTimes(1);
    expect(engine.getSnapshot().todos[0].status).toBe('pending');

    await vi.advanceTimersByTimeAsync(1100);
    expect(api.saveTodo).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(1100);
    expect(api.saveTodo).toHaveBeenCalledTimes(3);
    expect(engine.getSnapshot().todos[0].status).toBe('failed');

    await vi.advanceTimersByTimeAsync(10_000);
    expect(api.saveTodo).toHaveBeenCalledTimes(3);
  });

  it('surfaces a conflict when the server keeps a newer version', async () => {
    const { engine, api } = setup(true);
    api.saveTodo.mockImplementation(async (sent: Todo) => ({ ...sent, title: 'Edited elsewhere', updatedAt: sent.updatedAt + 1000 }));
    engine.add('Mine');
    await vi.waitFor(() => {
      expect(engine.getSnapshot().todos[0]).toMatchObject({ title: 'Edited elsewhere', status: 'conflict' });
    });
  });

  it('removes a synced todo optimistically and deletes it on the server', async () => {
    const { engine, api } = setup(true);
    const todo = engine.add('Temporary');
    await vi.waitFor(() => expect(engine.getSnapshot().todos[0].status).toBe('synced'));

    engine.remove(todo.id);
    expect(engine.getSnapshot().todos).toHaveLength(0);
    await vi.waitFor(() => expect(api.deleteTodo).toHaveBeenCalledWith(todo.id));
  });
});

describeTask('OfflineTodos UI', () => {
  it('shows a new todo as pending while offline and synced once back online', async () => {
    const user = userEvent.setup();
    const { engine, network } = setup(false);
    render(<OfflineTodos engine={engine} />);

    await user.type(screen.getByRole('textbox', { name: 'New todo' }), 'Buy milk');
    await user.click(screen.getByRole('button', { name: 'Add' }));

    const item = screen.getByRole('listitem');
    expect(item).toHaveTextContent('Buy milk');
    expect(within(item).getByText(/pending sync/i)).toBeInTheDocument();

    act(() => network.set(true));
    expect(await within(screen.getByRole('listitem')).findByText(/^synced$/i)).toBeInTheDocument();
    expect(within(screen.getByRole('listitem')).queryByText(/pending sync/i)).not.toBeInTheDocument();
  });
});
