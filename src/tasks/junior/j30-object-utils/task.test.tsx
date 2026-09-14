// ⚠ Unverified: written before the reference solution. If a test looks wrong, trust the README.
import { expect, it } from 'vitest';
import { pickTarget } from '../../../test/target';
import * as Reference from './Reference';
import * as Solution from './Solution';

const { impl, describeTask, describeFollowUp } = pickTarget(Solution, Reference);

describeTask('groupBy', () => {
  it('groups by a function or a property name, in first-seen order', () => {
    expect(impl.groupBy([6.1, 4.2, 6.3], Math.floor)).toEqual({ '4': [4.2], '6': [6.1, 6.3] });

    const people = [
      { name: 'Ada', team: 'core' },
      { name: 'Linus', team: 'kernel' },
      { name: 'Grace', team: 'core' },
    ];
    const byTeam = impl.groupBy(people, 'team');
    expect(byTeam).toEqual({ core: [people[0], people[2]], kernel: [people[1]] });
    expect(Object.keys(byTeam)).toEqual(['core', 'kernel']);
    expect(byTeam.core[0]).toBe(people[0]);
    expect(impl.groupBy([], (x) => String(x))).toEqual({});
  });

  it('handles keys that collide with Object.prototype names', () => {
    const words = ['constructor', 'toString', 'constructor', 'hasOwnProperty'];
    const result = impl.groupBy(words, (w) => w);
    expect(result.constructor).toEqual(['constructor', 'constructor']);
    expect(result.toString).toEqual(['toString']);
    expect(result.hasOwnProperty).toEqual(['hasOwnProperty']);
    expect(Object.keys(result).sort()).toEqual(['constructor', 'hasOwnProperty', 'toString']);
  });
});

describeTask('chunk', () => {
  it('splits into chunks with a shorter last chunk, without mutating', () => {
    const input = [1, 2, 3, 4, 5];
    expect(impl.chunk(input, 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(impl.chunk(input, 5)).toEqual([[1, 2, 3, 4, 5]]);
    expect(impl.chunk(input, 10)).toEqual([[1, 2, 3, 4, 5]]);
    expect(input).toEqual([1, 2, 3, 4, 5]);
  });

  it('returns [] for empty input or size < 1, and floors fractional sizes', () => {
    expect(impl.chunk([], 3)).toEqual([]);
    expect(impl.chunk([1, 2, 3], 0)).toEqual([]);
    expect(impl.chunk([1, 2, 3], -1)).toEqual([]);
    expect(impl.chunk([1, 2, 3, 4, 5], 2.7)).toEqual([[1, 2], [3, 4], [5]]);
  });
});

describeTask('deepMerge', () => {
  it('merges plain objects recursively and lets b win on conflicts', () => {
    const a = { ui: { dark: false, size: 'm', font: { family: 'Inter', px: 14 } }, lang: 'en' };
    const b = { ui: { dark: true, font: { px: 16 } }, beta: true };
    expect(impl.deepMerge(a, b)).toEqual({
      ui: { dark: true, size: 'm', font: { family: 'Inter', px: 16 } },
      lang: 'en',
      beta: true,
    });
  });

  it('replaces arrays, and replaces across type mismatches', () => {
    expect(impl.deepMerge({ tags: [1, 2, 3] }, { tags: [4] })).toEqual({ tags: [4] });
    expect(impl.deepMerge({ a: { x: 1 } }, { a: 5 })).toEqual({ a: 5 });
    expect(impl.deepMerge({ a: 5 }, { a: { x: 1 } })).toEqual({ a: { x: 1 } });
    expect(impl.deepMerge({ a: [1] }, { a: { 0: 2 } })).toEqual({ a: { 0: 2 } });
    expect(impl.deepMerge({ a: { 0: 1 } }, { a: [2] })).toEqual({ a: [2] });
  });

  it('treats non-plain objects as values', () => {
    const when = new Date('2024-01-01');
    const merged = impl.deepMerge({ when: { y: 2020 } as unknown }, { when });
    expect(merged.when).toBe(when);
  });

  it('does not mutate either input, and merged nested objects are new', () => {
    const a = { user: { name: 'Ada', roles: ['admin'] } };
    const b = { user: { email: 'ada@example.com' } };
    const snapA = JSON.stringify(a);
    const snapB = JSON.stringify(b);
    const merged = impl.deepMerge(a, b) as { user: Record<string, unknown> };
    expect(JSON.stringify(a)).toBe(snapA);
    expect(JSON.stringify(b)).toBe(snapB);
    expect(merged.user).not.toBe(a.user);
    expect(merged.user).not.toBe(b.user);
    merged.user.name = 'changed';
    expect(a.user.name).toBe('Ada');
  });
});

describeTask('deepOmit', () => {
  it('removes keys at every depth, including inside arrays', () => {
    const input = { a: 1, b: { a: 2, c: [{ a: 3, d: 4 }, 5, null] } };
    const snapshot = JSON.stringify(input);
    expect(impl.deepOmit(input, ['a'])).toEqual({ b: { c: [{ d: 4 }, 5, null] } });
    expect(JSON.stringify(input)).toBe(snapshot);
  });

  it('works on top-level arrays and primitives, with several keys', () => {
    const rows = [
      { id: 1, password: 'x', meta: { token: 't', ok: true } },
      { id: 2, password: 'y' },
    ];
    expect(impl.deepOmit(rows, ['password', 'token'])).toEqual([{ id: 1, meta: { ok: true } }, { id: 2 }]);
    expect(impl.deepOmit(42, ['a'])).toBe(42);
    expect(impl.deepOmit(null, ['a'])).toBe(null);
  });
});

describeTask('squashObject / unsquashObject', () => {
  it('squashes nested objects and arrays into dot paths, keeping null leaves', () => {
    expect(impl.squashObject({ a: { b: 1, c: [1] } })).toEqual({ 'a.b': 1, 'a.c.0': 1 });
    expect(
      impl.squashObject({
        a: 5,
        b: { c: null, d: { e: 'x' } },
        f: [10, { g: true }],
      }),
    ).toEqual({ a: 5, 'b.c': null, 'b.d.e': 'x', 'f.0': 10, 'f.1.g': true });
  });

  it('unsquashes into objects and arrays, and round-trips', () => {
    expect(impl.unsquashObject({ 'a.b': 1, 'a.c.0': 1 })).toEqual({ a: { b: 1, c: [1] } });

    const original = {
      id: 7,
      profile: { name: 'Ada', langs: ['en', 'fr'], address: { city: 'London', zip: null } },
      matrix: [
        [1, 2],
        [3, 4],
      ],
    };
    const squashed = impl.squashObject(original);
    const restored = impl.unsquashObject(squashed);
    expect(restored).toEqual(original);
    expect(Array.isArray((restored.profile as Record<string, unknown>).langs)).toBe(true);
    expect(Array.isArray((restored.matrix as unknown[])[0])).toBe(true);
  });
});

describeFollowUp(2, 'deepMerge arrays: concat', () => {
  it('concatenates arrays at the same key, at any depth', () => {
    const a = { tags: ['a'], nested: { ids: [1, 2] } };
    const b = { tags: ['b', 'c'], nested: { ids: [3] } };
    expect(impl.deepMerge(a, b, { arrays: 'concat' })).toEqual({ tags: ['a', 'b', 'c'], nested: { ids: [1, 2, 3] } });
    expect(a.tags).toEqual(['a']);
    expect(impl.deepMerge(a, b)).toEqual({ tags: ['b', 'c'], nested: { ids: [3] } });
  });
});

describeFollowUp(4, 'custom separator', () => {
  it('uses the separator in both directions', () => {
    const obj = { a: { b: 1, c: [true] } };
    expect(impl.squashObject(obj, { separator: '/' })).toEqual({ 'a/b': 1, 'a/c/0': true });
    expect(impl.unsquashObject({ 'a/b': 1, 'a/c/0': true }, { separator: '/' })).toEqual(obj);
  });
});
