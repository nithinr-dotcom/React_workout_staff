// ⚠ Unverified: written before the reference solution. If a test looks wrong, trust the README.
import { expect, it, vi } from 'vitest';
import { pickTarget } from '../../../test/target';
import * as Reference from './Reference';
import * as Solution from './Solution';
import { __ } from './types';

const { impl, describeTask, describeFollowUp } = pickTarget(Solution, Reference);

const join3 = (a: unknown, b: unknown, c: unknown) => [a, b, c];

describeTask('curry', () => {
  it('supports any grouping of arguments', () => {
    const f = impl.curry(join3);
    expect(f(1)(2)(3)).toEqual([1, 2, 3]);
    expect(f(1, 2)(3)).toEqual([1, 2, 3]);
    expect(f(1)(2, 3)).toEqual([1, 2, 3]);
    expect(f(1, 2, 3)).toEqual([1, 2, 3]);
  });

  it('does not call fn until the arity is satisfied', () => {
    let calls = 0;
    const f = impl.curry((a: number, b: number, c: number) => {
      calls++;
      return a + b + c;
    });
    const partial = f(1)(2);
    expect(calls).toBe(0);
    expect(typeof partial).toBe('function');
    expect(partial(3)).toBe(6);
    expect(calls).toBe(1);
  });

  it('keeps partial applications independent and reusable', () => {
    const f = impl.curry(join3);
    const f1 = f(1);
    const f12 = f1(2);
    expect(f12(3)).toEqual([1, 2, 3]);
    expect(f1(20)(30)).toEqual([1, 20, 30]);
    expect(f12(4)).toEqual([1, 2, 4]);
    expect(f(9, 9)(9)).toEqual([9, 9, 9]);
  });

  it('treats a call with no arguments as no progress', () => {
    let calls = 0;
    const f = impl.curry((a: number, b: number) => {
      calls++;
      return a * b;
    });
    expect(f()()(3)()(4)).toBe(12);
    expect(calls).toBe(1);
  });

  it('passes extra arguments through to fn', () => {
    const seen: unknown[][] = [];
    const twoPlusRest = (a: unknown, b: unknown, ...rest: unknown[]) => {
      seen.push([a, b, ...rest]);
      return rest.length;
    };
    const f = impl.curry(twoPlusRest);
    expect(f(1)(2, 3, 4)).toBe(2);
    expect(seen).toEqual([[1, 2, 3, 4]]);
  });

  it('uses an explicit arity instead of fn.length', () => {
    const sum = (...nums: number[]) => nums.reduce((a, b) => a + b, 0);
    const f = impl.curry(sum, 3);
    expect(typeof f(1)(2)).toBe('function');
    expect(f(1)(2)(3)).toBe(6);
    const now = impl.curry(() => 'called', 0);
    expect(now()).toBe('called');
  });
});

describeTask('pipe & compose', () => {
  const inc = (n: number) => n + 1;
  const double = (n: number) => n * 2;
  const square = (n: number) => n * n;

  it('pipe runs functions left to right', () => {
    expect(impl.pipe(inc, double, square)(2)).toBe(36);
  });

  it('compose runs functions right to left', () => {
    expect(impl.compose(inc, double, square)(2)).toBe(9);
  });

  it('gives all arguments to the first step only', () => {
    const add = vi.fn((a: number, b: number) => a + b);
    const next = vi.fn((n: number) => n * 10);
    expect(impl.pipe(add, next)(2, 3)).toBe(50);
    expect(next).toHaveBeenCalledWith(5);
    const addLast = vi.fn((a: number, b: number) => a + b);
    expect(impl.compose(double, addLast)(2, 3)).toBe(10);
    expect(addLast).toHaveBeenCalledWith(2, 3);
  });

  it('returns the first argument when given no functions', () => {
    const value = { id: 1 };
    expect(impl.pipe()(value)).toBe(value);
    expect(impl.compose()(value)).toBe(value);
  });

  it('calls nothing on creation and each step once per invocation', () => {
    const a = vi.fn((n: number) => n + 1);
    const b = vi.fn((n: number) => n + 1);
    const piped = impl.pipe(a, b);
    expect(a).not.toHaveBeenCalled();
    expect(piped(0)).toBe(2);
    expect(piped(10)).toBe(12);
    expect(a).toHaveBeenCalledTimes(2);
    expect(b).toHaveBeenCalledTimes(2);
  });
});

describeFollowUp(1, 'placeholders', () => {
  it('fills placeholder positions with later arguments, left to right', () => {
    const f = impl.curry(join3);
    expect(f(__, 2)(1)(3)).toEqual([1, 2, 3]);
    expect(f(__, __, 3)(1)(2)).toEqual([1, 2, 3]);
    expect(f(1, __, 3)(2)).toEqual([1, 2, 3]);
  });

  it('does not call fn while a placeholder remains inside the arity', () => {
    let calls = 0;
    const f = impl.curry((a: unknown, b: unknown, c: unknown) => {
      calls++;
      return [a, b, c];
    });
    const partial = f(__, 2, 3);
    expect(calls).toBe(0);
    expect(partial(1)).toEqual([1, 2, 3]);
  });
});

describeFollowUp(2, 'pipeAsync', () => {
  it('awaits each step and resolves with the final value', async () => {
    const run = impl.pipeAsync(
      (n: number) => n + 1,
      async (n: number) => n * 2,
      (n: number) => Promise.resolve(`value:${n}`),
    );
    const result = run(4);
    expect(result).toBeInstanceOf(Promise);
    await expect(result).resolves.toBe('value:10');
  });

  it('rejects and skips later steps when a step fails', async () => {
    const later = vi.fn();
    const boom = new Error('boom');
    await expect(
      impl.pipeAsync(
        (n: number) => n,
        async () => {
          throw boom;
        },
        later,
      )(1),
    ).rejects.toBe(boom);
    expect(later).not.toHaveBeenCalled();
  });
});
