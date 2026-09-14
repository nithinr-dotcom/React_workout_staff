// ⚠ Unverified: written before the reference solution. If a test looks wrong, trust the README.
import { expect, it, vi } from 'vitest';
import { pickTarget } from '../../../test/target';
import * as Reference from './Reference';
import * as Solution from './Solution';
import type { AnyFn } from './types';

const { impl, describeTask, describeFollowUp } = pickTarget(Solution, Reference);

/** [1, <hole>, 3] */
function sparse(): number[] {
  const a: number[] = [];
  a[0] = 1;
  a[2] = 3;
  return a;
}

const notAFunction = 'nope' as unknown as AnyFn;

describeTask('myMap', () => {
  it('maps with value, index and array, without mutating', () => {
    const arr = [1, 2, 3];
    const cb = vi.fn((n: number, i: number) => n * 10 + i);
    expect(impl.myMap(arr, cb)).toEqual([10, 21, 32]);
    expect(cb).toHaveBeenNthCalledWith(1, 1, 0, arr);
    expect(arr).toEqual([1, 2, 3]);
  });

  it('uses thisArg and preserves holes', () => {
    const ctx = { factor: 2 };
    const cb = vi.fn(function (this: { factor: number }, n: number) {
      return n * this.factor;
    });
    const result = impl.myMap(sparse(), cb, ctx);
    expect(result).toHaveLength(3);
    expect(result[0]).toBe(2);
    expect(1 in result).toBe(false);
    expect(result[2]).toBe(6);
    expect(cb).toHaveBeenCalledTimes(2);
  });

  it('throws a TypeError when the callback is not a function', () => {
    expect(() => impl.myMap([1], notAFunction)).toThrow(TypeError);
  });
});

describeTask('myFilter', () => {
  it('keeps elements with a truthy result, uses thisArg and skips holes', () => {
    const ctx = { min: 2 };
    const cb = vi.fn(function (this: { min: number }, n: number) {
      return n >= this.min ? 'yes' : 0;
    });
    const input = sparse();
    input.push(4, 0);
    const result = impl.myFilter(input, cb, ctx);
    expect(result).toEqual([3, 4]);
    expect(cb).toHaveBeenCalledTimes(4);
    expect(() => impl.myFilter([1], notAFunction)).toThrow(TypeError);
  });
});

describeTask('myReduce', () => {
  it('reduces with and without an initial value', () => {
    const arr = [1, 2, 3, 4];
    expect(impl.myReduce(arr, (acc, n) => acc + n)).toBe(10);
    expect(impl.myReduce(arr, (acc, n) => acc + n, 100)).toBe(110);
    const cb = vi.fn((acc: number, n: number) => acc + n);
    impl.myReduce(arr, cb);
    expect(cb).toHaveBeenCalledTimes(3);
    expect(cb).toHaveBeenNthCalledWith(1, 1, 2, 1, arr);
  });

  it('treats an explicit undefined as an initial value', () => {
    const cb = vi.fn((acc: unknown, n: number) => `${String(acc)}+${n}`);
    expect(impl.myReduce<number, unknown>([1, 2], cb, undefined)).toBe('undefined+1+2');
    expect(cb).toHaveBeenCalledTimes(2);
  });

  it('throws a TypeError for an empty array without an initial value', () => {
    expect(() => impl.myReduce([], (a: number, b: number) => a + b)).toThrow(TypeError);
    const holesOnly: number[] = [];
    holesOnly.length = 3;
    expect(() => impl.myReduce(holesOnly, (a, b) => a + b)).toThrow(TypeError);
    const cb = vi.fn();
    expect(impl.myReduce([], cb, 'init')).toBe('init');
    expect(cb).not.toHaveBeenCalled();
  });

  it('skips holes, including when picking the starting accumulator', () => {
    const a: number[] = [];
    a[2] = 5;
    const cb = vi.fn();
    expect(impl.myReduce(a, cb)).toBe(5);
    expect(cb).not.toHaveBeenCalled();

    const indexes: number[] = [];
    impl.myReduce(
      sparse(),
      (acc, n, i) => {
        indexes.push(i);
        return acc + n;
      },
      0,
    );
    expect(indexes).toEqual([0, 2]);
  });
});

describeTask('myCall / myApply', () => {
  function greet(this: { name: string }, greeting: string, punctuation: string) {
    return `${greeting}, ${this.name}${punctuation}`;
  }

  it('myCall sets this, forwards args and returns the result', () => {
    expect(impl.myCall(greet, { name: 'Ada' }, 'Hello', '!')).toBe('Hello, Ada!');
  });

  it('myApply takes an args array, and null/undefined args mean no arguments', () => {
    expect(impl.myApply(greet, { name: 'Linus' }, ['Hi', '?'])).toBe('Hi, Linus?');
    const countArgs = function (this: unknown, ...args: unknown[]) {
      return args.length;
    };
    expect(impl.myApply(countArgs, {}, null)).toBe(0);
    expect(impl.myApply(countArgs, {})).toBe(0);
  });

  it('leaves no trace on thisArg, even when fn throws', () => {
    const ctx = { name: 'Grace' };
    const before = Reflect.ownKeys(ctx);
    impl.myCall(greet, ctx, 'Hey', '.');
    expect(Reflect.ownKeys(ctx)).toEqual(before);

    const boom = function (this: unknown) {
      throw new Error('boom');
    };
    expect(() => impl.myApply(boom, ctx, [])).toThrow('boom');
    expect(Reflect.ownKeys(ctx)).toEqual(before);
  });

  it('throws a TypeError when fn is not a function', () => {
    expect(() => impl.myCall(notAFunction, {})).toThrow(TypeError);
    expect(() => impl.myApply(notAFunction, {}, [])).toThrow(TypeError);
  });
});

describeTask('myBind', () => {
  it('fixes this, even when called as a method of another object', () => {
    const counter = { count: 5 };
    const read = impl.myBind(function (this: { count: number }) {
      return this.count;
    }, counter);
    const other = { count: 99, read };
    expect(read()).toBe(5);
    expect(other.read()).toBe(5);
  });

  it('supports partial application', () => {
    const volume = impl.myBind(
      function (this: { unit: string }, l: number, w: number, h: number) {
        return `${l * w * h}${this.unit}`;
      },
      { unit: 'cm³' },
      2,
      3,
    );
    expect(volume(4)).toBe('24cm³');
  });

  it('throws a TypeError at bind time when fn is not a function', () => {
    expect(() => impl.myBind(notAFunction, {})).toThrow(TypeError);
  });
});

describeFollowUp(1, 'new on a bound function', () => {
  it('constructs the original function and ignores the bound this', () => {
    function Point(this: { x: number; y: number }, x: number, y: number) {
      this.x = x;
      this.y = y;
    }
    const ignored = { x: -1, y: -1 };
    const BoundPoint = impl.myBind(Point, ignored, 1) as unknown as new (y: number) => { x: number; y: number };
    const p = new BoundPoint(2);
    expect(p.x).toBe(1);
    expect(p.y).toBe(2);
    expect(p).toBeInstanceOf(Point);
    expect(ignored).toEqual({ x: -1, y: -1 });
  });
});

describeFollowUp(2, 'spec-accurate iteration', () => {
  it('works on array-likes', () => {
    const arrayLike = { 0: 'a', 1: 'b', length: 2 } as unknown as string[];
    expect(impl.myMap(arrayLike, (s) => s.toUpperCase())).toEqual(['A', 'B']);
    expect(impl.myFilter(arrayLike, (s) => s === 'b')).toEqual(['b']);
    expect(impl.myReduce(arrayLike, (acc, s) => acc + s, '')).toBe('ab');
  });

  it('does not visit elements appended during iteration', () => {
    const arr = [1, 2];
    const cb = vi.fn((n: number, _i: number, array: readonly number[]) => {
      // Bounded so a naive implementation fails instead of looping forever.
      if (array.length < 10) (array as number[]).push(n);
      return n;
    });
    expect(impl.myMap(arr, cb)).toEqual([1, 2]);
    expect(cb).toHaveBeenCalledTimes(2);
  });
});
