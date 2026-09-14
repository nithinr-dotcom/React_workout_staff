// ⚠ Unverified: written before the reference solution. If a test looks wrong, trust the README.
import { expect, it } from 'vitest';
import { pickTarget } from '../../../test/target';
import * as Reference from './Reference';
import * as Solution from './Solution';
import type { NestedArray } from './types';

const { impl, describeTask, describeFollowUp } = pickTarget(Solution, Reference);

describeTask('flatten', () => {
  it('flattens every level by default without mutating the input', () => {
    const input: NestedArray<number> = [1, [2, [3, [4, [5]]]], 6];
    const snapshot = JSON.stringify(input);
    expect(impl.flatten(input)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(JSON.stringify(input)).toBe(snapshot);
  });

  it('respects depth, and depth 0 returns a shallow copy', () => {
    const input: NestedArray<number> = [1, [2, [3, [4]]]];
    expect(impl.flatten(input, 1)).toEqual([1, 2, [3, [4]]]);
    expect(impl.flatten(input, 2)).toEqual([1, 2, 3, [4]]);
    const copy = impl.flatten(input, 0);
    expect(copy).toEqual(input);
    expect(copy).not.toBe(input);
  });

  it('only flattens real arrays and skips holes', () => {
    const sparse: NestedArray<unknown> = [];
    sparse[0] = 'a';
    sparse[2] = ['b'];
    const arrayLike = { 0: 'x', length: 1 };
    expect(impl.flatten<unknown>([sparse, 'cd', arrayLike, [[]]])).toEqual(['a', 'b', 'cd', arrayLike]);
  });
});

describeTask('get', () => {
  const data = {
    user: {
      name: 'Ada',
      addresses: [{ city: 'London' }, { city: 'Paris' }],
      manager: null,
      score: 0,
      active: false,
      nickname: '',
    },
    matrix: [
      [1, 2],
      [3, 4],
    ],
  };

  it('reads dot and bracket paths', () => {
    expect(impl.get(data, 'user.name')).toBe('Ada');
    expect(impl.get(data, 'user.addresses[1].city')).toBe('Paris');
    expect(impl.get(data, 'matrix[1][0]')).toBe(3);
  });

  it('reads array paths', () => {
    expect(impl.get(data, ['user', 'addresses', 0, 'city'])).toBe('London');
    expect(impl.get(data, ['matrix', 0, 1])).toBe(2);
  });

  it('returns defaultValue for missing paths without throwing', () => {
    expect(impl.get(data, 'user.addresses[5].city', 'n/a')).toBe('n/a');
    expect(impl.get(data, 'user.manager.name', 'none')).toBe('none');
    expect(impl.get(data, 'nope.deeper.still')).toBeUndefined();
    expect(impl.get(null, 'a.b', 42)).toBe(42);
  });

  it('returns null and other falsy values as-is', () => {
    expect(impl.get(data, 'user.manager', 'default')).toBeNull();
    expect(impl.get(data, 'user.score', 'default')).toBe(0);
    expect(impl.get(data, 'user.active', 'default')).toBe(false);
    expect(impl.get(data, 'user.nickname', 'default')).toBe('');
  });
});

describeTask('classnames', () => {
  it('joins strings and skips falsy values', () => {
    expect(impl.classnames('btn', null, undefined, false, true, '', 0, 'primary')).toBe('btn primary');
  });

  it('includes object keys with truthy values, in order', () => {
    expect(impl.classnames({ active: true, disabled: false, big: 1, small: 0, label: 'yes' })).toBe('active big label');
  });

  it('handles nested arrays and numbers', () => {
    expect(impl.classnames('a', ['b', ['c', { d: true }], null], 7)).toBe('a b c d 7');
  });

  it('returns an empty string when nothing is truthy', () => {
    expect(impl.classnames()).toBe('');
    expect(impl.classnames(null, [false, { x: false }], '')).toBe('');
  });
});

describeFollowUp(1, 'set', () => {
  it('creates missing objects and arrays and returns the same object', () => {
    const obj: Record<string, unknown> = {};
    const result = impl.set(obj, 'a.b[0].c', 1);
    expect(result).toBe(obj);
    expect(obj).toEqual({ a: { b: [{ c: 1 }] } });
    expect(Array.isArray((obj.a as { b: unknown }).b)).toBe(true);
  });

  it('overwrites existing values and accepts array paths', () => {
    const obj = { a: { b: 1, keep: true } };
    impl.set(obj, ['a', 'b'], 2);
    expect(obj).toEqual({ a: { b: 2, keep: true } });
  });
});

describeFollowUp(2, 'iterative flatten', () => {
  it('flattens 100 000 levels of nesting without a stack overflow', () => {
    let deep: NestedArray<number> = [1];
    for (let i = 0; i < 100_000; i++) deep = [deep];
    expect(impl.flatten(deep)).toEqual([1]);
  });

  it('keeps order and depth semantics', () => {
    expect(impl.flatten([1, [2, [3]], [[4], 5]], 1)).toEqual([1, 2, [3], [4], 5]);
  });
});
