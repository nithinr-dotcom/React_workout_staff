import { expect, it, vi } from 'vitest';
import { pickTarget } from '../../../test/target';
import * as Reference from './Reference';
import * as Solution from './Solution';

const { impl, describeTask, describeFollowUp } = pickTarget(Solution, Reference);
const { EventEmitter } = impl;

describeTask('EventEmitter', () => {
  it('calls listeners in registration order with the emitted arguments', () => {
    const emitter = new EventEmitter();
    const calls: string[] = [];
    emitter.on('greet', (name: string, punctuation: string) => calls.push(`first ${name}${punctuation}`));
    emitter.on('greet', (name: string) => calls.push(`second ${name}`));
    emitter.emit('greet', 'Ada', '!');
    expect(calls).toEqual(['first Ada!', 'second Ada']);
  });

  it('emit returns whether the event had listeners', () => {
    const emitter = new EventEmitter();
    expect(emitter.emit('nothing')).toBe(false);
    emitter.on('something', () => {});
    expect(emitter.emit('something')).toBe(true);
    expect(emitter.emit('nothing')).toBe(false);
  });

  it('calls listeners with `this` set to the emitter, and instances do not share listeners', () => {
    const a = new EventEmitter();
    const b = new EventEmitter();
    let seen: unknown;
    a.on('x', function (this: unknown) {
      seen = this;
    });
    expect(b.emit('x')).toBe(false);
    a.emit('x');
    expect(seen).toBe(a);
  });

  it('on() returns an unsubscribe function that removes only that registration', () => {
    const emitter = new EventEmitter();
    const fn = vi.fn();
    const other = vi.fn();
    const unsubscribe = emitter.on('tick', fn);
    emitter.on('tick', other);
    unsubscribe();
    unsubscribe(); // second call is a no-op
    emitter.emit('tick');
    expect(fn).not.toHaveBeenCalled();
    expect(other).toHaveBeenCalledTimes(1);
    expect(emitter.listenerCount('tick')).toBe(1);
  });

  it('treats the same function registered twice as two registrations; off removes one', () => {
    const emitter = new EventEmitter();
    const fn = vi.fn();
    emitter.on('tick', fn);
    emitter.on('tick', fn);
    expect(emitter.listenerCount('tick')).toBe(2);
    emitter.emit('tick');
    expect(fn).toHaveBeenCalledTimes(2);
    emitter.off('tick', fn);
    expect(emitter.listenerCount('tick')).toBe(1);
    emitter.emit('tick');
    expect(fn).toHaveBeenCalledTimes(3);
    expect(() => emitter.off('unknown', fn)).not.toThrow();
  });

  it('off removes the most recently added registration of that listener', () => {
    const emitter = new EventEmitter();
    const order: string[] = [];
    const shared = () => order.push('shared');
    emitter.on('e', shared);
    emitter.on('e', () => order.push('middle'));
    emitter.on('e', shared);
    emitter.off('e', shared);
    emitter.emit('e');
    expect(order).toEqual(['shared', 'middle']);
  });

  it('uses a snapshot: listeners removed during emit still run, listeners added during emit do not', () => {
    const emitter = new EventEmitter();
    const calls: string[] = [];
    const second = () => calls.push('second');
    const added = () => calls.push('added');
    emitter.on('e', () => {
      calls.push('first');
      emitter.off('e', second);
      emitter.on('e', added);
    });
    emitter.on('e', second);
    emitter.emit('e');
    expect(calls).toEqual(['first', 'second']);
    calls.length = 0;
    emitter.emit('e');
    expect(calls).toEqual(['first', 'added']);
  });

  it('lets a listener unsubscribe itself during emit without skipping the next listener', () => {
    const emitter = new EventEmitter();
    const calls: string[] = [];
    const unsubscribe = emitter.on('e', () => {
      calls.push('self-removing');
      unsubscribe();
    });
    emitter.on('e', () => calls.push('next'));
    emitter.emit('e');
    emitter.emit('e');
    expect(calls).toEqual(['self-removing', 'next', 'next']);
  });

  it('once() runs at most once, even when it re-emits the same event', () => {
    const emitter = new EventEmitter();
    const fn = vi.fn(() => {
      emitter.emit('ready', 'nested');
    });
    emitter.once('ready', fn);
    emitter.emit('ready', 'outer');
    emitter.emit('ready', 'again');
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('outer');
    expect(emitter.listenerCount('ready')).toBe(0);
  });

  it('once() can be removed before firing via its unsubscribe or off(event, original)', () => {
    const emitter = new EventEmitter();
    const viaUnsubscribe = vi.fn();
    const viaOff = vi.fn();
    const unsubscribe = emitter.once('e', viaUnsubscribe);
    emitter.once('e', viaOff);
    unsubscribe();
    emitter.off('e', viaOff);
    expect(emitter.emit('e')).toBe(false);
    expect(viaUnsubscribe).not.toHaveBeenCalled();
    expect(viaOff).not.toHaveBeenCalled();
  });

  it('removeAllListeners clears one event or every event', () => {
    const emitter = new EventEmitter();
    emitter.on('a', () => {});
    emitter.on('a', () => {});
    emitter.on('b', () => {});
    emitter.removeAllListeners('a');
    expect(emitter.listenerCount('a')).toBe(0);
    expect(emitter.listenerCount('b')).toBe(1);
    emitter.removeAllListeners();
    expect(emitter.listenerCount('b')).toBe(0);
    expect(emitter.emit('b')).toBe(false);
  });

  it('handles event names that collide with Object.prototype keys', () => {
    const emitter = new EventEmitter();
    expect(emitter.listenerCount('constructor')).toBe(0);
    expect(emitter.emit('toString')).toBe(false);
    const fn = vi.fn();
    emitter.on('__proto__', fn);
    expect(emitter.emit('__proto__', 1)).toBe(true);
    expect(fn).toHaveBeenCalledWith(1);
    expect(emitter.listenerCount('hasOwnProperty')).toBe(0);
  });
});

describeFollowUp(1, 'wildcard listeners', () => {
  it("'*' listeners run after named listeners on every emit and receive the event name", () => {
    const emitter = new EventEmitter();
    const calls: unknown[][] = [];
    emitter.on('*', (...args: unknown[]) => calls.push(['*', ...args]));
    emitter.on('save', (...args: unknown[]) => calls.push(['save', ...args]));
    expect(emitter.emit('save', 1, 2)).toBe(true);
    expect(emitter.emit('other')).toBe(true);
    expect(calls).toEqual([
      ['save', 1, 2],
      ['*', 'save', 1, 2],
      ['*', 'other'],
    ]);
  });
});

describeFollowUp(2, 'error events', () => {
  it("throws when 'error' is emitted with no error listener", () => {
    const emitter = new EventEmitter();
    const err = new Error('disk full');
    expect(() => emitter.emit('error', err)).toThrow(err);
    expect(() => emitter.emit('error', 'not an error')).toThrow('Unhandled error event');
    emitter.on('*', () => {});
    expect(() => emitter.emit('error', err)).toThrow(err);
  });

  it("does not throw when an 'error' listener exists", () => {
    const emitter = new EventEmitter();
    const onError = vi.fn();
    emitter.on('error', onError);
    const err = new Error('handled');
    expect(emitter.emit('error', err)).toBe(true);
    expect(onError).toHaveBeenCalledWith(err);
  });
});

describeFollowUp(3, 'waitFor', () => {
  it('resolves with the args of the next emit and leaves no listener behind', async () => {
    const emitter = new EventEmitter();
    const result = emitter.waitFor('connected');
    expect(emitter.listenerCount('connected')).toBe(1);
    emitter.emit('connected', 'socket-1', 42);
    await expect(result).resolves.toEqual(['socket-1', 42]);
    expect(emitter.listenerCount('connected')).toBe(0);
  });

  it('rejects with AbortError and removes its listener when the signal aborts', async () => {
    const emitter = new EventEmitter();
    const controller = new AbortController();
    const result = emitter.waitFor('connected', { signal: controller.signal });
    controller.abort();
    const error = await result.catch((e: unknown) => e);
    expect(error).toBeInstanceOf(DOMException);
    expect((error as DOMException).name).toBe('AbortError');
    expect(emitter.listenerCount('connected')).toBe(0);

    const aborted = new AbortController();
    aborted.abort();
    const early = await emitter.waitFor('connected', { signal: aborted.signal }).catch((e: unknown) => e);
    expect((early as DOMException).name).toBe('AbortError');
    expect(emitter.listenerCount('connected')).toBe(0);
  });
});
