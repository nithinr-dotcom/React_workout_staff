// ⚠ Unverified: written before the reference solution. If a test looks wrong, trust the README.
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { pickTarget } from '../../../test/target';
import * as Reference from './Reference';
import * as Solution from './Solution';
import type { NotificationFeedProps, NotificationMessage } from './types';

const { impl, describeTask } = pickTarget(Solution, Reference);
const NotificationFeed = impl.default;

const msg = (id: string, createdAt: number, title = `Title ${id}`): NotificationMessage => ({
  type: 'notification',
  id,
  kind: 'comment',
  title,
  createdAt,
});

class FakeSocket extends EventTarget {
  close = vi.fn(() => {
    this.dispatchEvent(new Event('close'));
  });
  open() {
    this.dispatchEvent(new Event('open'));
  }
  push(...messages: (NotificationMessage | string)[]) {
    for (const m of messages) {
      this.dispatchEvent(new MessageEvent('message', { data: typeof m === 'string' ? m : JSON.stringify(m) }));
    }
  }
  drop() {
    this.dispatchEvent(new Event('close'));
  }
}

function setup(props: Partial<NotificationFeedProps> = {}) {
  const sockets: FakeSocket[] = [];
  const createSocket = vi.fn(() => {
    const socket = new FakeSocket();
    sockets.push(socket);
    return socket;
  });
  const fetchMissed = vi.fn(async (_since: number): Promise<NotificationMessage[]> => []);
  const utils = render(
    <NotificationFeed createSocket={createSocket} fetchMissed={fetchMissed} backoff={() => 1000} {...props} />,
  );
  act(() => sockets[0].open());
  return { ...utils, sockets, createSocket, fetchMissed };
}

const flush = () =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(300);
  });

const titlesInOrder = () =>
  within(screen.getByRole('list', { name: 'Notifications' }))
    .queryAllByRole('listitem')
    .map((li) => li.textContent ?? '');

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});
afterEach(() => {
  vi.useRealTimers();
});

describeTask('Notification store', () => {
  it('orders newest first, counts unread and keeps a stable snapshot', () => {
    const store = impl.createNotificationStore();
    const listener = vi.fn();
    store.subscribe(listener);
    store.addMany([msg('a', 1000), msg('c', 3000)]);
    store.addMany([msg('b', 2000)]);
    const snap = store.getSnapshot();
    expect(snap.items.map((i) => i.id)).toEqual(['c', 'b', 'a']);
    expect(snap.unreadCount).toBe(3);
    expect(snap.lastEventTime).toBe(3000);
    expect(store.getSnapshot()).toBe(snap);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('dedupes by id without resetting read state', () => {
    const store = impl.createNotificationStore();
    store.addMany([msg('a', 1000)]);
    store.markRead('a');
    store.addMany([msg('a', 1000), msg('b', 2000)]);
    const snap = store.getSnapshot();
    expect(snap.items).toHaveLength(2);
    expect(snap.items.find((i) => i.id === 'a')?.read).toBe(true);
    expect(snap.unreadCount).toBe(1);
    store.markAllRead();
    expect(store.getSnapshot().unreadCount).toBe(0);
  });

  it('evicts the oldest items beyond cap but remembers lastEventTime', () => {
    const store = impl.createNotificationStore({ cap: 3 });
    store.addMany([msg('1', 1), msg('2', 2), msg('3', 3), msg('4', 4), msg('5', 5)]);
    expect(store.getSnapshot().items.map((i) => i.id)).toEqual(['5', '4', '3']);
    expect(store.getSnapshot().lastEventTime).toBe(5);
  });
});

describeTask('NotificationFeed', () => {
  it('shows an empty state, then renders incoming messages newest first with an unread count', async () => {
    const { sockets } = setup();
    expect(screen.getByText('No notifications')).toBeInTheDocument();
    expect(screen.getByText('0 unread')).toBeInTheDocument();

    act(() => sockets[0].push(msg('a', 1000, 'Deploy finished'), msg('b', 2000, 'You were mentioned')));
    await flush();

    const titles = titlesInOrder();
    expect(titles).toHaveLength(2);
    expect(titles[0]).toContain('You were mentioned');
    expect(titles[1]).toContain('Deploy finished');
    expect(screen.getByText('2 unread')).toBeInTheDocument();
    expect(screen.queryByText('No notifications')).not.toBeInTheDocument();
  });

  it('ignores malformed and duplicate messages', async () => {
    const { sockets } = setup();
    act(() => sockets[0].push(msg('a', 1000, 'Only once'), 'not json {', msg('a', 1000, 'Only once')));
    await flush();
    act(() => sockets[0].push(msg('a', 1000, 'Only once')));
    await flush();
    expect(titlesInOrder()).toHaveLength(1);
    expect(screen.getByText('1 unread')).toBeInTheDocument();
  });

  it('batches a same-tick burst into a single store write', async () => {
    const store = impl.createNotificationStore();
    const addMany = vi.spyOn(store, 'addMany');
    const { sockets } = setup({ store });
    act(() => sockets[0].push(...Array.from({ length: 20 }, (_, i) => msg(`n${i}`, 1000 + i))));
    await flush();
    expect(titlesInOrder()).toHaveLength(20);
    expect(addMany.mock.calls.length).toBeGreaterThanOrEqual(1);
    expect(addMany.mock.calls.length).toBeLessThanOrEqual(2);
    expect(screen.getByText('20 unread')).toBeInTheDocument();
  });

  it('marks one item and then all items as read', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const { sockets } = setup();
    act(() => sockets[0].push(msg('a', 1000), msg('b', 2000), msg('c', 3000)));
    await flush();
    expect(screen.getByText('3 unread')).toBeInTheDocument();

    const [newest] = within(screen.getByRole('list', { name: 'Notifications' })).getAllByRole('listitem');
    await user.click(within(newest).getByRole('button', { name: 'Mark as read' }));
    expect(screen.getByText('2 unread')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Mark all as read' }));
    expect(screen.getByText('0 unread')).toBeInTheDocument();
  });

  it('reconnects after the backoff delay and resyncs missed messages since the last event', async () => {
    const { sockets, createSocket, fetchMissed } = setup();
    act(() => sockets[0].push(msg('a', 1000, 'Before the drop')));
    await flush();

    act(() => sockets[0].drop());
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    expect(createSocket).toHaveBeenCalledTimes(1);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
    });
    expect(createSocket).toHaveBeenCalledTimes(2);

    fetchMissed.mockResolvedValueOnce([msg('a', 1000, 'Before the drop'), msg('m', 1500, 'Missed while offline')]);
    await act(async () => {
      sockets[1].open();
    });
    expect(fetchMissed).toHaveBeenCalledWith(1000);
    await flush();

    const titles = titlesInOrder();
    expect(titles).toHaveLength(2);
    expect(titles[0]).toContain('Missed while offline');
  });

  it('closes the socket on unmount and never reconnects afterwards', async () => {
    const { sockets, createSocket, unmount } = setup();
    unmount();
    expect(sockets[0].close).toHaveBeenCalled();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });
    expect(createSocket).toHaveBeenCalledTimes(1);
  });
});
