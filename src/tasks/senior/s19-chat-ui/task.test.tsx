// ⚠ Unverified: written before the reference solution. If a test looks wrong, trust the README.
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { pickTarget } from '../../../test/target';
import * as Reference from './Reference';
import * as Solution from './Solution';
import type { ChatMessage, ChatSocket, ChatUIProps } from './types';

const { impl, describeTask, describeFollowUp } = pickTarget(Solution, Reference);
const ChatUI = impl.default;

class FakeSocket extends EventTarget implements ChatSocket {
  readyState = 0;
  send = vi.fn();
  close = vi.fn(() => {
    this.readyState = 3;
  });
  open() {
    this.readyState = 1;
    act(() => {
      this.dispatchEvent(new Event('open'));
    });
  }
  receive(data: ChatMessage | string | object) {
    act(() => {
      this.dispatchEvent(new MessageEvent('message', { data: typeof data === 'string' ? data : JSON.stringify(data) }));
    });
  }
  drop(wasClean = false) {
    this.readyState = 3;
    act(() => {
      this.dispatchEvent(new CloseEvent('close', { code: wasClean ? 1000 : 1006, wasClean }));
    });
  }
}

let seq = 0;
const msg = (author: string, text: string): ChatMessage => ({
  type: 'chat',
  id: `id-${++seq}`,
  author,
  text,
  sentAt: Date.UTC(2026, 0, 1, 12, 0, seq),
});

function setup(props: Partial<ChatUIProps> = {}) {
  const sockets: FakeSocket[] = [];
  const createSocket = vi.fn(() => {
    const s = new FakeSocket();
    sockets.push(s);
    return s;
  });
  const utils = render(<ChatUI createSocket={createSocket} {...props} />);
  return { ...utils, sockets, createSocket, socket: () => sockets[sockets.length - 1] };
}

const log = () => screen.getByRole('log', { name: 'Messages' });
const items = () => within(log()).queryAllByRole('listitem');

/** jsdom has no layout: fake the log's scroll geometry. */
function stubScroll(el: HTMLElement, scrollHeight: number, clientHeight: number, initialTop: number) {
  let top = initialTop;
  Object.defineProperty(el, 'scrollHeight', { configurable: true, get: () => scrollHeight });
  Object.defineProperty(el, 'clientHeight', { configurable: true, get: () => clientHeight });
  Object.defineProperty(el, 'scrollTop', {
    configurable: true,
    get: () => top,
    set: (v: number) => {
      top = v;
    },
  });
  const scrollTo = (v: number) => {
    top = v;
    fireEvent.scroll(el);
  };
  scrollTo(initialTop);
  return {
    scrollTo,
    get top() {
      return top;
    },
  };
}

describeTask('ChatUI', () => {
  it('creates one socket on mount and shows Connecting… then Connected', () => {
    const { createSocket, socket } = setup();
    expect(createSocket).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('status')).toHaveTextContent(/connecting/i);
    socket().open();
    expect(screen.getByRole('status')).toHaveTextContent(/\bconnected\b/i);
    expect(createSocket).toHaveBeenCalledTimes(1);
  });

  it('shows Disconnected when the socket closes', () => {
    const { socket } = setup();
    socket().open();
    socket().drop();
    expect(screen.getByRole('status')).toHaveTextContent(/disconnected/i);
  });

  it('renders incoming chat messages in order with author and text', () => {
    const { socket } = setup();
    socket().open();
    socket().receive(msg('Priya', 'PR is up for review'));
    socket().receive(msg('Ben', 'lgtm'));
    const rows = items();
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent('Priya');
    expect(rows[0]).toHaveTextContent('PR is up for review');
    expect(rows[1]).toHaveTextContent('Ben');
    expect(rows[1]).toHaveTextContent('lgtm');
  });

  it('ignores malformed, non-chat and duplicate messages', () => {
    const { socket } = setup();
    socket().open();
    const m = msg('Priya', 'hello');
    socket().receive('not json {');
    socket().receive({ type: 'notification', id: 'n1', kind: 'deploy', title: 'Deployed', createdAt: 1 });
    socket().receive(m);
    socket().receive(m);
    expect(items()).toHaveLength(1);
    expect(items()[0]).toHaveTextContent('hello');
  });

  it('sends trimmed text as JSON with the Send button and clears the field', async () => {
    const user = userEvent.setup();
    const { socket } = setup();
    socket().open();
    const field = screen.getByRole('textbox', { name: 'Message' });
    await user.type(field, '  hi there  ');
    await user.click(screen.getByRole('button', { name: 'Send' }));
    expect(socket().send).toHaveBeenCalledTimes(1);
    expect(JSON.parse(socket().send.mock.calls[0][0])).toEqual({ text: 'hi there' });
    expect(field).toHaveValue('');
  });

  it('sends on Enter and inserts a newline on Shift+Enter', async () => {
    const user = userEvent.setup();
    const { socket } = setup();
    socket().open();
    const field = screen.getByRole('textbox', { name: 'Message' });
    await user.type(field, 'line one{Shift>}{Enter}{/Shift}line two');
    expect(socket().send).not.toHaveBeenCalled();
    expect(field).toHaveValue('line one\nline two');
    await user.keyboard('{Enter}');
    expect(socket().send).toHaveBeenCalledTimes(1);
    expect(JSON.parse(socket().send.mock.calls[0][0])).toEqual({ text: 'line one\nline two' });
    expect(field).toHaveValue('');
  });

  it('never sends whitespace-only text and disables Send while not connected', async () => {
    const user = userEvent.setup();
    const { socket } = setup();
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled();
    socket().open();
    expect(screen.getByRole('button', { name: 'Send' })).toBeEnabled();
    await user.type(screen.getByRole('textbox', { name: 'Message' }), '   {Enter}');
    expect(socket().send).not.toHaveBeenCalled();
    socket().drop();
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled();
  });

  it('keeps only the newest maxMessages messages', () => {
    const { socket } = setup({ maxMessages: 3 });
    socket().open();
    for (const text of ['one', 'two', 'three', 'four', 'five']) socket().receive(msg('Ana', text));
    const rows = items();
    expect(rows).toHaveLength(3);
    expect(rows.map((r) => r.textContent)).toEqual([
      expect.stringContaining('three'),
      expect.stringContaining('four'),
      expect.stringContaining('five'),
    ]);
  });

  it('auto-scrolls to the bottom when the user is near the bottom', () => {
    const { socket } = setup();
    socket().open();
    // 1000 - 750 - 200 = 50px from the bottom, within the default 80px threshold.
    const geo = stubScroll(log(), 1000, 200, 750);
    socket().receive(msg('Ana', 'new one'));
    expect(geo.top).toBeGreaterThanOrEqual(800);
    expect(screen.queryByRole('button', { name: /new message/i })).not.toBeInTheDocument();
  });

  it('keeps position and shows an unread count when scrolled up; the button jumps to the bottom', async () => {
    const user = userEvent.setup();
    const { socket } = setup();
    socket().open();
    const geo = stubScroll(log(), 1000, 200, 100);
    socket().receive(msg('Ana', 'a'));
    socket().receive(msg('Ben', 'b'));
    expect(geo.top).toBe(100);
    expect(screen.getByRole('button', { name: /2 new message/i })).toBeInTheDocument();
    socket().receive(msg('Cy', 'c'));
    const button = screen.getByRole('button', { name: /3 new message/i });
    await user.click(button);
    expect(geo.top).toBeGreaterThanOrEqual(800);
    expect(screen.queryByRole('button', { name: /new message/i })).not.toBeInTheDocument();
  });

  it('clears the unread button when the user scrolls back to the bottom by hand', () => {
    const { socket } = setup();
    socket().open();
    const geo = stubScroll(log(), 1000, 200, 0);
    socket().receive(msg('Ana', 'a'));
    expect(screen.getByRole('button', { name: /1 new message/i })).toBeInTheDocument();
    geo.scrollTo(800);
    expect(screen.queryByRole('button', { name: /new message/i })).not.toBeInTheDocument();
    // Now at the bottom again: the next message auto-scrolls and shows no button.
    socket().receive(msg('Ben', 'b'));
    expect(screen.queryByRole('button', { name: /new message/i })).not.toBeInTheDocument();
  });

  it('closes the socket on unmount', () => {
    const { socket, unmount } = setup();
    socket().open();
    unmount();
    expect(socket().close).toHaveBeenCalled();
  });
});

describeFollowUp(1, 'reconnect with backoff', () => {
  it('reconnects after unexpected drops with doubling delay, resetting after open', () => {
    vi.useFakeTimers();
    const { socket, createSocket } = setup({ reconnect: { baseDelay: 1000, maxDelay: 8000 } });
    socket().open();
    socket().drop();
    expect(screen.getByRole('status')).toHaveTextContent(/reconnecting/i);

    act(() => void vi.advanceTimersByTime(999));
    expect(createSocket).toHaveBeenCalledTimes(1);
    act(() => void vi.advanceTimersByTime(1));
    expect(createSocket).toHaveBeenCalledTimes(2);

    // Second attempt fails before opening: next delay doubles to 2000ms.
    socket().drop();
    act(() => void vi.advanceTimersByTime(1999));
    expect(createSocket).toHaveBeenCalledTimes(2);
    act(() => void vi.advanceTimersByTime(1));
    expect(createSocket).toHaveBeenCalledTimes(3);

    // A successful open resets the delay.
    socket().open();
    expect(screen.getByRole('status')).toHaveTextContent(/\bconnected\b/i);
    socket().drop();
    act(() => void vi.advanceTimersByTime(1000));
    expect(createSocket).toHaveBeenCalledTimes(4);
  });

  it('does not reconnect after a clean close or after unmount', () => {
    vi.useFakeTimers();
    const { socket, createSocket, unmount } = setup({ reconnect: { baseDelay: 1000 } });
    socket().open();
    socket().drop(true);
    act(() => void vi.advanceTimersByTime(60_000));
    expect(createSocket).toHaveBeenCalledTimes(1);

    unmount();
    const second = setup({ reconnect: { baseDelay: 1000 } });
    second.socket().open();
    second.socket().drop();
    second.unmount();
    act(() => void vi.advanceTimersByTime(60_000));
    expect(second.createSocket).toHaveBeenCalledTimes(1);
  });
});
