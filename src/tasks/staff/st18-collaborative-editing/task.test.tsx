// ⚠ Unverified: written before the reference solution. If a test looks wrong, trust the README.
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it } from 'vitest';
import { pickTarget } from '../../../test/target';
import * as Reference from './Reference';
import * as Solution from './Solution';
import type { CollabModule, DeleteComponent, InsertComponent, Message, Network, OTClient, Operation } from './types';

const { impl, describeTask, describeFollowUp } = pickTarget<CollabModule>(Solution, Reference);

const ins = (pos: number, text: string): InsertComponent => ({ type: 'insert', pos, text });
const del = (pos: number, len: number): DeleteComponent => ({ type: 'delete', pos, len });

/** Small seeded PRNG (mulberry32), so every "random" run is reproducible. */
function prng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const int = (random: () => number, max: number) => Math.floor(random() * (max + 1)); // 0..max

function randomText(random: () => number, maxLen: number) {
  let s = '';
  const len = int(random, maxLen);
  for (let i = 0; i < len; i++) s += 'abcdefghij'[int(random, 9)];
  return s;
}

/** A valid operation on `doc` with 1–3 components (applied sequentially). */
function randomOp(random: () => number, doc: string): Operation {
  const op: Operation = [];
  const count = 1 + int(random, 2);
  for (let i = 0; i < count; i++) {
    if (doc.length === 0 || random() < 0.55) {
      const c = ins(int(random, doc.length), randomText(random, 2) || 'z');
      op.push(c);
      doc = doc.slice(0, c.pos) + c.text + doc.slice(c.pos);
    } else {
      const pos = int(random, doc.length - 1);
      const c = del(pos, 1 + int(random, Math.min(3, doc.length - pos) - 1));
      op.push(c);
      doc = doc.slice(0, c.pos) + doc.slice(c.pos + c.len);
    }
  }
  return op;
}

/** Deterministic network: messages wait in per-link FIFO queues until the test delivers them. */
function manualNetwork(random: () => number = Math.random) {
  const handlers = new Map<string, (from: string, message: Message) => void>();
  const links = new Map<string, { from: string; to: string; queue: Message[] }>();
  const network: Network = {
    send(from, to, message) {
      const key = `${from}->${to}`;
      if (!links.has(key)) links.set(key, { from, to, queue: [] });
      links.get(key)!.queue.push(structuredClone(message));
    },
    listen(id, handler) {
      handlers.set(id, handler);
      return () => {
        handlers.delete(id);
      };
    },
  };
  const deliver = (from: string, to: string) => {
    const link = links.get(`${from}->${to}`);
    const message = link?.queue.shift();
    if (message) handlers.get(to)?.(from, message);
    return Boolean(message);
  };
  const busy = () => [...links.values()].filter((l) => l.queue.length > 0);
  return {
    network,
    deliver,
    queued: (from: string, to: string) => links.get(`${from}->${to}`)?.queue.length ?? 0,
    pendingCount: () => busy().reduce((n, l) => n + l.queue.length, 0),
    deliverRandom() {
      const candidates = busy();
      if (candidates.length === 0) return false;
      const link = candidates[int(random, candidates.length - 1)];
      return deliver(link.from, link.to);
    },
    flush() {
      let guard = 0;
      while (this.deliverRandom()) if (++guard > 10_000) throw new Error('network never drained');
    },
  };
}

function world(doc: string, clientIds: string[], random?: () => number) {
  const net = manualNetwork(random);
  const server = impl.createServer({ doc, network: net.network });
  const clients = clientIds.map((id) => impl.createClient({ id, network: net.network, ...server.join(id) }));
  return { net, server, clients };
}

function expectConverged(server: { getDoc(): string; getRevision(): number }, clients: OTClient[]) {
  for (const client of clients) {
    expect(client.getDoc()).toBe(server.getDoc());
    expect(client.getState()).toBe('synchronized');
    expect(client.getRevision()).toBe(server.getRevision());
  }
}

describeTask('OT core: apply / transform / compose', () => {
  it('apply runs components left to right and throws RangeError when out of range', () => {
    expect(impl.apply('hello', [])).toBe('hello');
    expect(impl.apply('hello', [ins(5, ' world')])).toBe('hello world');
    expect(impl.apply('hello', [del(0, 1), ins(0, 'J')])).toBe('Jello');
    expect(impl.apply('abc', [ins(1, 'XY'), del(3, 1)])).toBe('aXYc');
    expect(() => impl.apply('abc', [ins(4, 'x')])).toThrow(RangeError);
    expect(() => impl.apply('abc', [del(2, 2)])).toThrow(RangeError);
  });

  it('transform: positions shift, and the tie-break decides same-position inserts', () => {
    const both = (doc: string, a: Operation, b: Operation, tie: 'left' | 'right') =>
      impl.apply(impl.apply(doc, b), impl.transform(a, b, tie));
    expect(both('abcdef', [ins(1, 'X')], [ins(4, 'Y')], 'left')).toBe('aXbcdYef');
    expect(both('abcdef', [ins(5, 'X')], [del(0, 2)], 'left')).toBe('cdeXf');
    expect(both('ab', [ins(1, 'X')], [ins(1, 'Y')], 'left')).toBe('aXYb');
    expect(both('ab', [ins(1, 'X')], [ins(1, 'Y')], 'right')).toBe('aYXb');
    expect(impl.transform([ins(2, 'X')], [], 'left')).toEqual([ins(2, 'X')]);
    expect(impl.apply('abc', impl.transform([], [del(0, 1)], 'left'))).toBe('abc');
  });

  it('transform preserves intent: a concurrent insert inside a deleted range survives, overlapping deletes remove text once', () => {
    const doc = 'abcdef';
    const deleteMiddle: Operation = [del(1, 4)]; // → "af"
    const insertInside: Operation = [ins(3, 'XY')]; // → "abcXYdef"
    expect(impl.apply(impl.apply(doc, insertInside), impl.transform(deleteMiddle, insertInside, 'left'))).toBe('aXYf');
    expect(impl.apply(impl.apply(doc, deleteMiddle), impl.transform(insertInside, deleteMiddle, 'right'))).toBe('aXYf');

    const d1: Operation = [del(1, 3)]; // removes "bcd"
    const d2: Operation = [del(2, 3)]; // removes "cde"
    expect(impl.apply(impl.apply(doc, d2), impl.transform(d1, d2, 'left'))).toBe('af');
    expect(impl.apply(impl.apply(doc, d1), impl.transform(d2, d1, 'right'))).toBe('af');
  });

  it('TP1 holds for 600 seeded random pairs of multi-component operations', () => {
    const random = prng(42);
    for (let i = 0; i < 600; i++) {
      const doc = randomText(random, 12);
      const a = randomOp(random, doc);
      const b = randomOp(random, doc);
      const [tieA, tieB] = i % 2 ? (['left', 'right'] as const) : (['right', 'left'] as const);
      const viaA = impl.apply(impl.apply(doc, a), impl.transform(b, a, tieB));
      const viaB = impl.apply(impl.apply(doc, b), impl.transform(a, b, tieA));
      if (viaA !== viaB) {
        throw new Error(`TP1 violated for doc=${JSON.stringify(doc)} a=${JSON.stringify(a)} b=${JSON.stringify(b)}: ${viaA} vs ${viaB}`);
      }
    }
  });

  it('compose is equivalent to applying both, and compacts typing and backspacing', () => {
    const random = prng(7);
    for (let i = 0; i < 300; i++) {
      const doc = randomText(random, 10);
      const a = randomOp(random, doc);
      const b = randomOp(random, impl.apply(doc, a));
      expect(impl.apply(doc, impl.compose(a, b))).toBe(impl.apply(impl.apply(doc, a), b));
    }

    let typed: Operation = [];
    'Hello'.split('').forEach((ch, i) => (typed = impl.compose(typed, [ins(i, ch)])));
    expect(typed).toEqual([ins(0, 'Hello')]);
    expect(impl.compose([ins(0, 'Hello')], [del(4, 1)])).toEqual([ins(0, 'Hell')]);
    expect(impl.compose([ins(3, 'ab')], [del(3, 2)])).toEqual([]);
    expect(impl.compose([del(4, 1)], [del(3, 1)])).toEqual([del(3, 2)]);
  });
});

describeTask('Client / server protocol', () => {
  it('a client has at most one op in flight and composes further local edits into one buffer', () => {
    const { net, server, clients } = world('', ['alice']);
    const [alice] = clients;
    expect(alice.getState()).toBe('synchronized');

    alice.applyLocal([ins(0, 'H')]);
    expect(alice.getDoc()).toBe('H');
    expect(alice.getState()).toBe('awaitingConfirm');
    alice.applyLocal([ins(1, 'i')]);
    alice.applyLocal([ins(2, '!')]);
    expect(alice.getDoc()).toBe('Hi!');
    expect(alice.getState()).toBe('awaitingWithBuffer');
    expect(net.queued('alice', 'server')).toBe(1);

    net.flush();
    expect(server.getDoc()).toBe('Hi!');
    expect(server.getRevision()).toBe(2);
    expectConverged(server, clients);
  });

  it('a remote op that arrives while an op is pending is transformed and applied immediately', () => {
    const { net, server, clients } = world('abc', ['alice', 'bob']);
    const [alice, bob] = clients;
    const seen: string[] = [];
    alice.subscribe((change) => seen.push(`${change.source}:${alice.getDoc()}`));

    alice.applyLocal([ins(0, 'A')]);
    bob.applyLocal([ins(3, 'B')]);
    expect(net.deliver('bob', 'server')).toBe(true);
    expect(net.deliver('server', 'alice')).toBe(true); // Bob's op reaches Alice before her ack

    expect(alice.getDoc()).toBe('AabcB');
    expect(alice.getState()).toBe('awaitingConfirm');
    expect(alice.getRevision()).toBe(1);
    expect(seen).toEqual(['local:Aabc', 'remote:AabcB']);

    net.flush();
    expect(server.getDoc()).toBe('AabcB');
    expectConverged(server, clients);
  });

  it('two and three clients converge under 60 seeded random interleavings of edits and deliveries', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const random = prng(seed);
      const ids = seed % 2 ? ['alice', 'bob'] : ['alice', 'bob', 'carol'];
      const { net, server, clients } = world('hello world', ids, random);
      for (let step = 0; step < 40; step++) {
        if (random() < 0.5 || net.pendingCount() === 0) {
          const client = clients[int(random, clients.length - 1)];
          client.applyLocal(randomOp(random, client.getDoc()));
        } else {
          net.deliverRandom();
        }
      }
      net.flush();
      try {
        expectConverged(server, clients);
      } catch (error) {
        throw new Error(`seed ${seed}: ${(error as Error).message}`);
      }
    }
  });
});

describeTask('Collaborative demo', () => {
  it('typing in Alice’s editor shows up in Bob’s', async () => {
    const user = userEvent.setup();
    render(<impl.default initialDelayMs={0} />);
    const alice = await screen.findByRole('textbox', { name: 'Alice' });
    const bob = screen.getByRole('textbox', { name: 'Bob' });
    expect(screen.getByRole('slider', { name: /network delay/i })).toBeInTheDocument();

    await user.type(alice, 'Hello');
    await waitFor(() => expect(bob).toHaveValue('Hello'));
    expect(alice).toHaveValue('Hello');
  });

  it('concurrent edits made under latency converge in both editors', async () => {
    render(<impl.default initialText="--" initialDelayMs={0} />);
    const alice = await screen.findByRole('textbox', { name: 'Alice' });
    const bob = screen.getByRole('textbox', { name: 'Bob' });
    fireEvent.change(screen.getByRole('slider', { name: /network delay/i }), { target: { value: '150' } });

    fireEvent.change(alice, { target: { value: 'A--' } });
    fireEvent.change(bob, { target: { value: '--B' } });
    expect(alice).toHaveValue('A--');
    expect(bob).toHaveValue('--B');

    await waitFor(
      () => {
        expect(alice).toHaveValue('A--B');
        expect(bob).toHaveValue('A--B');
      },
      { timeout: 3000 },
    );
  });
});

describeFollowUp(1, 'transformPosition for cursors', () => {
  it('moves a cursor through local and remote operations', () => {
    const tp = impl.transformPosition;
    expect(tp).toBeTypeOf('function');
    expect(tp!(3, [ins(1, 'XX')], false)).toBe(5);
    expect(tp!(3, [ins(4, 'XX')], false)).toBe(3);
    expect(tp!(3, [ins(3, 'XX')], true)).toBe(5);
    expect(tp!(3, [ins(3, 'XX')], false)).toBe(3);
    expect(tp!(3, [del(1, 4)], false)).toBe(1);
    expect(tp!(3, [del(0, 1), ins(0, 'abc')], false)).toBe(5);
  });
});
