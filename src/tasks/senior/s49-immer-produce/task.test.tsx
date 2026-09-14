// ⚠ Unverified: written before the reference solution. If a test looks wrong, trust the README.
import { expect, it } from 'vitest';
import { pickTarget } from '../../../test/target';
import * as Reference from './Reference';
import * as Solution from './Solution';
import type { ProduceModule } from './types';

const { impl: rawImpl, describeTask, describeFollowUp } = pickTarget(Solution, Reference);
const impl = rawImpl as unknown as ProduceModule;

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Object.keys(value)) deepFreeze((value as Record<string, unknown>)[key]);
  }
  return value;
}

/** structuredClone throws on any Proxy, revoked or not. */
function expectNoProxies(value: unknown) {
  expect(() => structuredClone(value)).not.toThrow();
}

interface User {
  name: string;
  tags: string[];
  address: { city: string; zip: string };
}
interface State {
  users: Record<string, User>;
  todos: { id: number; title: string; done: boolean }[];
  settings: { theme: string; flags: { beta: boolean } };
  count: number;
  selected?: unknown;
}

function makeState(): State {
  return deepFreeze({
    users: {
      u1: { name: 'Ada', tags: ['admin'], address: { city: 'London', zip: 'N1' } },
      u2: { name: 'Linus', tags: [], address: { city: 'Portland', zip: '97201' } },
    },
    todos: [
      { id: 1, title: 'write tests', done: true },
      { id: 2, title: 'write code', done: false },
      { id: 3, title: 'ship', done: false },
    ],
    settings: { theme: 'light', flags: { beta: false } },
    count: 0,
  });
}

describeTask('produce', () => {
  it('applies nested mutations without touching a frozen base', () => {
    const base = makeState();
    const snapshot = JSON.stringify(base);
    const next = impl.produce(base, (draft) => {
      draft.users.u1.tags.push('owner');
      draft.users.u1.address.city = 'Cambridge';
      draft.settings.theme = 'dark';
    });
    expect(next.users.u1.tags).toEqual(['admin', 'owner']);
    expect(next.users.u1.address.city).toBe('Cambridge');
    expect(next.settings.theme).toBe('dark');
    expect(JSON.stringify(base)).toBe(snapshot);
    expectNoProxies(next);
  });

  it('shares every untouched subtree and copies only the changed path', () => {
    const base = makeState();
    const next = impl.produce(base, (draft) => {
      draft.users.u1.address.zip = 'CB2';
    });
    expect(next).not.toBe(base);
    expect(next.users).not.toBe(base.users);
    expect(next.users.u1).not.toBe(base.users.u1);
    expect(next.users.u1.address).not.toBe(base.users.u1.address);
    // untouched
    expect(next.users.u1.tags).toBe(base.users.u1.tags);
    expect(next.users.u2).toBe(base.users.u2);
    expect(next.todos).toBe(base.todos);
    expect(next.settings).toBe(base.settings);
  });

  it('returns base itself when nothing changed', () => {
    const base = makeState();
    const next = impl.produce(base, (draft) => {
      void draft.users.u1.address.city;
      void draft.todos.map((t) => t.title);
      draft.count = 0;
      draft.settings.flags.beta = false;
      delete (draft.settings as Record<string, unknown>).missing;
    });
    expect(next).toBe(base);
  });

  it('supports array methods and reads reflect earlier writes', () => {
    const base = makeState();
    const next = impl.produce(base, (draft) => {
      draft.todos.push({ id: 4, title: 'celebrate', done: false });
      draft.todos.splice(0, 1);
      draft.todos[0].done = true;
      draft.todos.reverse();
      draft.count = draft.todos.filter((t) => !t.done).length * 10 + draft.todos.length;
      draft.users.u2.tags.unshift('kernel');
      draft.users.u2.tags.push('git');
      draft.users.u2.tags.pop();
    });
    expect(next.todos.map((t) => t.id)).toEqual([4, 3, 2]);
    expect(next.todos[2]).toEqual({ id: 2, title: 'write code', done: true });
    expect(next.todos[1]).toBe(base.todos[2]);
    expect(next.count).toBe(23);
    expect(next.users.u2.tags).toEqual(['kernel']);
    expect(base.todos).toHaveLength(3);
    expectNoProxies(next);
  });

  it('adds and deletes properties, and truncates arrays via length', () => {
    const base = makeState();
    const next = impl.produce(base, (draft) => {
      draft.users.u3 = { name: 'Grace', tags: ['navy'], address: { city: 'Arlington', zip: '22201' } };
      delete (draft.users as Record<string, User | undefined>).u2;
      draft.todos.length = 1;
    });
    expect(Object.keys(next.users)).toEqual(['u1', 'u3']);
    expect('u2' in next.users).toBe(false);
    expect(next.users.u1).toBe(base.users.u1);
    expect(next.todos).toEqual([base.todos[0]]);
    expect(next.todos[0]).toBe(base.todos[0]);
    expect(Object.keys(base.users)).toEqual(['u1', 'u2']);
  });

  it('finalizes drafts that were moved or placed inside new objects', () => {
    const base = makeState();
    const next = impl.produce(base, (draft) => {
      draft.selected = { user: draft.users.u2, first: draft.todos[0] };
      draft.todos = draft.todos.filter((t) => !t.done);
      draft.todos[0].title = 'write more code';
    });
    expectNoProxies(next);
    const selected = next.selected as { user: User; first: unknown };
    expect(selected.user).toBe(base.users.u2);
    expect(selected.first).toBe(base.todos[0]);
    expect(next.todos).toEqual([
      { id: 2, title: 'write more code', done: false },
      { id: 3, title: 'ship', done: false },
    ]);
    expect(next.todos[1]).toBe(base.todos[2]);
    expect(base.todos[1].title).toBe('write code');
  });

  it('uses a returned value as the result, and throws if the draft was also modified', () => {
    const base = makeState();
    const replacement = { fresh: true };
    expect(impl.produce<unknown>(base, () => replacement)).toBe(replacement);
    expect(impl.produce(base, (draft) => draft)).toBe(base);
    const same = impl.produce(base, (draft) => {
      draft.count = 5;
      return draft;
    });
    expect(same.count).toBe(5);
    expect(impl.produce(1, () => 2)).toBe(2);
    expect(() =>
      impl.produce<unknown>(base, (draft) => {
        (draft as State).count = 1;
        return { other: true };
      }),
    ).toThrow(Error);
    expect(base.count).toBe(0);
  });

  it('a leaked draft cannot change the result or the base later', () => {
    const base = makeState();
    let leaked: State | undefined;
    const next = impl.produce(base, (draft) => {
      leaked = draft;
      draft.settings.theme = 'dark';
    });
    const nextSnapshot = JSON.stringify(next);
    const baseSnapshot = JSON.stringify(base);
    try {
      leaked!.settings.theme = 'hacked';
    } catch {
      // throwing on a revoked draft is fine
    }
    try {
      leaked!.todos.push({ id: 99, title: 'hacked', done: false });
    } catch {
      // throwing on a revoked draft is fine
    }
    expect(JSON.stringify(next)).toBe(nextSnapshot);
    expect(JSON.stringify(base)).toBe(baseSnapshot);
  });

  it('keeps aliases of the same child in sync', () => {
    const base = makeState();
    const next = impl.produce(base, (draft) => {
      const a = draft.settings.flags;
      const b = draft.settings.flags;
      a.beta = true;
      expect(b.beta).toBe(true);
      expect(draft.settings.flags).toBe(a);
    });
    expect(next.settings.flags).toEqual({ beta: true });
  });
});

describeFollowUp(1, 'autoFreeze', () => {
  it('freezes newly created nodes and still shares untouched subtrees', () => {
    const base = {
      list: [{ id: 1 }, { id: 2 }],
      meta: { page: 1 },
      untouched: { deep: { x: 1 } },
    };
    const next = impl.produce(
      base,
      (draft) => {
        draft.list.push({ id: 3 });
        draft.meta.page = 2;
      },
      { autoFreeze: true },
    );
    expect(Object.isFrozen(next)).toBe(true);
    expect(Object.isFrozen(next.list)).toBe(true);
    expect(Object.isFrozen(next.list[2])).toBe(true);
    expect(Object.isFrozen(next.meta)).toBe(true);
    expect(next.untouched).toBe(base.untouched);
    expect(() => {
      (next.meta as { page: number }).page = 3;
    }).toThrow(TypeError);
  });
});

describeFollowUp(3, 'patches', () => {
  it('produces patches that replay forwards and backwards', () => {
    const base = makeState();
    const [next, patches, inverse] = impl.produceWithPatches(base, (draft) => {
      draft.users.u1.tags.push('owner');
      delete (draft.users as Record<string, User | undefined>).u2;
      draft.todos.splice(1, 1);
      draft.settings.flags.beta = true;
      draft.count = 42;
    });
    expect(Array.isArray(patches)).toBe(true);
    expect(patches.length).toBeGreaterThan(0);
    expect(impl.applyPatches(base, patches)).toEqual(next);
    expect(impl.applyPatches(next, inverse)).toEqual(base);
    expect(JSON.stringify(base)).toBe(JSON.stringify(makeState()));
  });
});
