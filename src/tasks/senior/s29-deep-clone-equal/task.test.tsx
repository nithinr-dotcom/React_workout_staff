// ⚠ Unverified: written before the reference solution. If a test looks wrong, trust the README.
import { expect, it } from 'vitest';
import { pickTarget } from '../../../test/target';
import * as Reference from './Reference';
import * as Solution from './Solution';

const { impl, describeTask, describeFollowUp } = pickTarget(Solution, Reference);

describeTask('deepClone', () => {
  it('returns primitives as-is', () => {
    const sym = Symbol('s');
    for (const v of [1, 'a', true, null, undefined, 10n, sym]) {
      expect(impl.deepClone(v)).toBe(v);
    }
    expect(Number.isNaN(impl.deepClone(NaN))).toBe(true);
  });

  it('deep-copies nested arrays and plain objects', () => {
    const original = { user: { name: 'Ada', tags: ['a', 'b'] }, list: [[1, 2], { x: 3 }] };
    const copy = impl.deepClone(original);
    expect(copy).toEqual(original);
    expect(copy).not.toBe(original);
    expect(copy.user).not.toBe(original.user);
    expect(copy.user.tags).not.toBe(original.user.tags);
    expect(copy.list[0]).not.toBe(original.list[0]);
    copy.user.tags.push('c');
    (copy.list[1] as { x: number }).x = 99;
    expect(original.user.tags).toEqual(['a', 'b']);
    expect((original.list[1] as { x: number }).x).toBe(3);
  });

  it('clones Date and RegExp into new instances', () => {
    const original = { when: new Date('2026-01-02T03:04:05Z'), pattern: /ab+c/gi };
    const copy = impl.deepClone(original);
    expect(copy.when).toBeInstanceOf(Date);
    expect(copy.when).not.toBe(original.when);
    expect(copy.when.getTime()).toBe(original.when.getTime());
    expect(copy.pattern).toBeInstanceOf(RegExp);
    expect(copy.pattern).not.toBe(original.pattern);
    expect(copy.pattern.source).toBe('ab+c');
    expect(copy.pattern.flags).toBe('gi');
  });

  it('clones Map values and Set elements deeply, keeping insertion order', () => {
    const inner = { n: 1 };
    const map = new Map<string, { n: number }>([
      ['b', inner],
      ['a', { n: 2 }],
    ]);
    const set = new Set([inner, 'x']);
    const copy = impl.deepClone({ map, set });
    expect(copy.map).toBeInstanceOf(Map);
    expect(copy.map).not.toBe(map);
    expect([...copy.map.keys()]).toEqual(['b', 'a']);
    expect(copy.map.get('b')).toEqual({ n: 1 });
    expect(copy.map.get('b')).not.toBe(inner);
    expect(copy.set).toBeInstanceOf(Set);
    expect(copy.set).not.toBe(set);
    const [first, second] = [...copy.set];
    expect(first).toEqual({ n: 1 });
    expect(first).not.toBe(inner);
    expect(second).toBe('x');
  });

  it('reproduces circular references', () => {
    const original: { name: string; self?: unknown; list: unknown[] } = { name: 'root', list: [] };
    original.self = original;
    original.list.push(original.list);
    const copy = impl.deepClone(original);
    expect(copy).not.toBe(original);
    expect(copy.self).toBe(copy);
    expect(copy.list).not.toBe(original.list);
    expect(copy.list[0]).toBe(copy.list);
  });

  it('preserves shared references as a single copy', () => {
    const shared = { v: 1 };
    const original = { a: shared, b: [shared], c: new Map([['k', shared]]) };
    const copy = impl.deepClone(original);
    expect(copy.a).not.toBe(shared);
    expect(copy.b[0]).toBe(copy.a);
    expect(copy.c.get('k')).toBe(copy.a);
  });

  it('copies functions by reference', () => {
    const fn = () => 42;
    const copy = impl.deepClone({ fn });
    expect(copy.fn).toBe(fn);
  });
});

describeTask('deepEqual', () => {
  it('compares primitives with SameValueZero and no coercion', () => {
    expect(impl.deepEqual(1, 1)).toBe(true);
    expect(impl.deepEqual('a', 'a')).toBe(true);
    expect(impl.deepEqual(NaN, NaN)).toBe(true);
    expect(impl.deepEqual(0, -0)).toBe(true);
    expect(impl.deepEqual(1, '1')).toBe(false);
    expect(impl.deepEqual(null, undefined)).toBe(false);
    expect(impl.deepEqual(null, {})).toBe(false);
  });

  it('compares arrays and objects structurally, ignoring key order', () => {
    expect(impl.deepEqual({ a: 1, b: [1, { c: 2 }] }, { b: [1, { c: 2 }], a: 1 })).toBe(true);
    expect(impl.deepEqual({ a: 1, b: [1, { c: 2 }] }, { a: 1, b: [1, { c: 3 }] })).toBe(false);
    expect(impl.deepEqual([1, 2], [1, 2, 3])).toBe(false);
    expect(impl.deepEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
  });

  it('distinguishes missing keys from undefined values and arrays from objects', () => {
    expect(impl.deepEqual({ a: undefined }, {})).toBe(false);
    expect(impl.deepEqual({ a: undefined }, { b: undefined })).toBe(false);
    expect(impl.deepEqual([1, 2], { 0: 1, 1: 2 })).toBe(false);
    expect(impl.deepEqual({}, [])).toBe(false);
  });

  it('compares Date, RegExp, Map and Set by content', () => {
    expect(impl.deepEqual(new Date(5), new Date(5))).toBe(true);
    expect(impl.deepEqual(new Date(5), new Date(6))).toBe(false);
    expect(impl.deepEqual(new Date(5), 5)).toBe(false);
    expect(impl.deepEqual(/a/g, /a/g)).toBe(true);
    expect(impl.deepEqual(/a/g, /a/i)).toBe(false);
    expect(impl.deepEqual(new Map([['k', { v: 1 }]]), new Map([['k', { v: 1 }]]))).toBe(true);
    expect(impl.deepEqual(new Map([['k', { v: 1 }]]), new Map([['k', { v: 2 }]]))).toBe(false);
    expect(impl.deepEqual(new Map([['k', 1]]), new Map([['j', 1]]))).toBe(false);
    expect(impl.deepEqual(new Set([1, { x: 1 }]), new Set([{ x: 1 }, 1]))).toBe(true);
    expect(impl.deepEqual(new Set([1, 2]), new Set([1, 3]))).toBe(false);
    expect(impl.deepEqual(new Set([1]), new Map([[1, 1]]))).toBe(false);
  });

  it('terminates on cycles and compares cyclic shapes', () => {
    const a: Record<string, unknown> = { v: 1 };
    a.self = a;
    const b: Record<string, unknown> = { v: 1 };
    b.self = b;
    const c: Record<string, unknown> = { v: 2 };
    c.self = c;
    expect(impl.deepEqual(a, b)).toBe(true);
    expect(impl.deepEqual(a, c)).toBe(false);
  });

  it('considers a value equal to its deep clone', () => {
    const shared = { id: 7 };
    const original: Record<string, unknown> = {
      when: new Date(1_700_000_000_000),
      re: /x+/m,
      map: new Map<string, unknown>([['s', shared]]),
      set: new Set([shared, 'y']),
      list: [shared, [1, 2, NaN]],
    };
    original.self = original;
    expect(impl.deepEqual(original, impl.deepClone(original))).toBe(true);
  });
});

describeFollowUp(1, 'symbol keys', () => {
  it('clones own enumerable symbol-keyed properties', () => {
    const key = Symbol('k');
    const original = { [key]: { nested: true }, plain: 1 };
    const copy = impl.deepClone(original);
    expect(copy[key]).toEqual({ nested: true });
    expect(copy[key]).not.toBe(original[key]);
  });

  it('compares symbol-keyed properties', () => {
    const key = Symbol('k');
    expect(impl.deepEqual({ [key]: 1 }, { [key]: 1 })).toBe(true);
    expect(impl.deepEqual({ [key]: 1 }, { [key]: 2 })).toBe(false);
    expect(impl.deepEqual({ [key]: 1 }, {})).toBe(false);
  });
});
