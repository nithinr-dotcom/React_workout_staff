// ⚠ Unverified: written before the reference solution. If a test looks wrong, trust the README.
import { afterEach, expect, it, vi } from 'vitest';
import { pickTarget } from '../../../test/target';
import * as Reference from './Reference';
import * as Solution from './Solution';
import type { Replacer } from './types';

const { impl, describeTask, describeFollowUp } = pickTarget(Solution, Reference);

// Captured before any spying so expectations always use the real implementation.
const nativeStringify = JSON.stringify.bind(JSON);
const nativeParse = JSON.parse.bind(JSON);

afterEach(() => {
  vi.restoreAllMocks();
});

const sparse = [1, , 3]; // eslint-disable-line no-sparse-arrays

const STRINGIFY_PRIMITIVES: [string, unknown][] = [
  ['string', 'hello'],
  ['empty string', ''],
  ['integer', 42],
  ['negative float', -3.25],
  ['exponent', 1e21],
  ['negative zero', -0],
  ['true', true],
  ['false', false],
  ['null', null],
  ['NaN', NaN],
  ['Infinity', Infinity],
  ['-Infinity', -Infinity],
  ['escapes', 'quote " backslash \\ newline \n tab \t cr \r bs \b ff \f'],
  ['control characters', 'nul \u0000 soh \u0001 us \u001f del \u007f'],
  ['non-ASCII', 'café ✓ 😀'],
  ['boxed primitives', [new String('s'), new Number(7), new Boolean(false)]],
];

const STRINGIFY_STRUCTURES: [string, unknown][] = [
  ['empty object', {}],
  ['empty array', []],
  ['nested', { a: [1, { b: 'x', c: [true, null] }], d: { e: {} } }],
  ['key order incl. integer-like keys', { b: 1, 2: 'two', a: 2, 1: 'one' }],
  ['keys needing escapes', { 'a"b': 1, 'line\nbreak': 2 }],
  ['omitted object values', { a: undefined, b: () => 1, c: Symbol('s'), d: 'kept' }],
  ['nulls in arrays', [undefined, () => 1, Symbol('s'), 'kept']],
  ['sparse array', sparse],
  ['symbol keys ignored', { [Symbol('k')]: 1, visible: 2 }],
  ['Map / Set / RegExp', { m: new Map([[1, 2]]), s: new Set([1]), r: /x/g }],
  ['NaN inside structures', { n: NaN, arr: [Infinity] }],
];

describeTask('stringify', () => {
  it.each(STRINGIFY_PRIMITIVES)('matches native for %s', (_, value) => {
    expect(impl.stringify(value)).toBe(nativeStringify(value));
  });

  it.each(STRINGIFY_STRUCTURES)('matches native for %s', (_, value) => {
    expect(impl.stringify(value)).toBe(nativeStringify(value));
  });

  it('returns undefined for a top-level undefined, function or symbol', () => {
    expect(impl.stringify(undefined)).toBeUndefined();
    expect(impl.stringify(() => 1)).toBeUndefined();
    expect(impl.stringify(Symbol('x'))).toBeUndefined();
  });

  it('calls toJSON with the property key at any depth, including Date', () => {
    const seenKeys: string[] = [];
    const tracked = (label: string) => ({
      toJSON(key: string) {
        seenKeys.push(key);
        return { label, key };
      },
    });
    const value = {
      when: new Date(Date.UTC(2024, 0, 2, 3, 4, 5)),
      invalid: new Date(NaN),
      nested: { deep: tracked('deep') },
      list: [tracked('first')],
      gone: { toJSON: () => undefined },
    };
    expect(impl.stringify(value)).toBe(nativeStringify(value));
    expect(seenKeys).toEqual(['deep', '0', 'deep', '0']); // once for ours, once for native

    seenKeys.length = 0;
    const top = tracked('top');
    expect(impl.stringify(top)).toBe('{"label":"top","key":""}');
    expect(seenKeys).toEqual(['']);
  });

  it('throws a TypeError for BigInt', () => {
    expect(() => impl.stringify(10n)).toThrow(TypeError);
    expect(() => impl.stringify({ a: [1, 2n] })).toThrow(TypeError);
  });

  it('throws a TypeError for cycles but not for shared references', () => {
    const cyclic: Record<string, unknown> = { name: 'root' };
    cyclic.self = { parent: cyclic };
    expect(() => impl.stringify(cyclic)).toThrow(TypeError);

    const arr: unknown[] = [];
    arr.push(arr);
    expect(() => impl.stringify(arr)).toThrow(TypeError);

    const shared = { x: 1 };
    const value = { a: shared, b: shared, list: [shared, [shared]] };
    expect(impl.stringify(value)).toBe(nativeStringify(value));
  });
});

const PARSE_VALID = [
  'null',
  'true',
  'false',
  '0',
  '42',
  '-12.5',
  '1.5e3',
  '2E-2',
  '1e+2',
  '"plain"',
  '""',
  '"escapes: \\" \\\\ \\/ \\b \\f \\n \\r \\t \\u0041 \\u00e9 \\ud83d\\ude00"',
  '"unicode ✓ café"',
  '[]',
  '{}',
  '[1,"two",true,null,[],{}]',
  '{"a":[1,{"b":null}],"c":"d","e":{"f":{"g":[[[]]]}}}',
  ' \n\t\r{ "a" : [ 1 , 2 ] , "b" : { } } \n ',
  '{"dup":1,"dup":2}',
  '{"":"empty key","a b":"space"}',
];

const PARSE_INVALID = [
  '',
  '   ',
  '{',
  '[',
  '[1,]',
  '{"a":1,}',
  "{'a':1}",
  '{a:1}',
  '{"a" 1}',
  '{"a":}',
  '[1 2]',
  '1 2',
  '01',
  '1.',
  '.5',
  '+1',
  '-',
  '1e',
  'tru',
  'nul',
  'NaN',
  'Infinity',
  'undefined',
  '"abc',
  '"tab\tinside"',
  '"\\x41"',
  '"\\u12G4"',
  '[1]]',
  '{"a":1}}',
];

describeTask('parse', () => {
  it.each(PARSE_VALID)('matches native for %j', (text) => {
    expect(impl.parse(text)).toEqual(nativeParse(text));
  });

  it.each(PARSE_INVALID)('throws a SyntaxError for %j', (text) => {
    expect(() => nativeParse(text)).toThrow(SyntaxError); // sanity check of the table
    expect(() => impl.parse(text)).toThrow(SyntaxError);
  });

  it('creates __proto__ as an own property instead of changing the prototype', () => {
    const result = impl.parse('{"__proto__":{"polluted":true}}') as Record<string, unknown>;
    expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
    expect(Object.prototype.hasOwnProperty.call(result, '__proto__')).toBe(true);
    expect((result as { polluted?: boolean }).polluted).toBeUndefined();
  });

  it('round-trips a realistic payload with stringify, without calling native JSON', () => {
    const payload = {
      id: 17,
      user: { name: 'Ada "the first"', tags: ['admin', 'ops'], active: true, score: -0.5 },
      items: [{ sku: 'A-1', qty: 2, price: 9.99 }, { sku: 'B\n2', qty: 1, price: 1e-7 }],
      meta: null,
    };
    const expected = nativeStringify(payload);
    const stringifySpy = vi.spyOn(JSON, 'stringify');
    const parseSpy = vi.spyOn(JSON, 'parse');

    const text = impl.stringify(payload);
    const back = impl.parse(text!);

    expect(stringifySpy).not.toHaveBeenCalled();
    expect(parseSpy).not.toHaveBeenCalled();
    expect(text).toBe(expected);
    expect(back).toEqual(payload);
  });
});

describeFollowUp(1, 'replacer and space', () => {
  const value = {
    name: 'Ada',
    age: 36,
    password: 'secret',
    tags: ['a', 'b'],
    nested: { password: 'also secret', ok: true, empty: {}, none: [] },
    when: new Date(Date.UTC(2020, 5, 1)),
  };

  const CASES: [string, Replacer, string | number | undefined][] = [
    ['space as number', null, 2],
    ['space capped at 10', null, 20],
    ['space as string', null, '--'],
    ['space string capped at 10 chars', null, '0123456789abcdef'],
    ['space < 1 means none', null, 0],
    ['array replacer', ['name', 'nested', 'ok', 'tags'], undefined],
    ['array replacer with numbers and space', ['name', 0, 'tags'], 1],
    [
      'function replacer drops and transforms',
      function (this: unknown, key: string, v: unknown) {
        if (key === 'password') return undefined;
        if (typeof v === 'number') return v * 2;
        return v;
      },
      '\t',
    ],
    [
      'function replacer sees the holder and runs after toJSON',
      function (this: Record<string, unknown>, key: string, v: unknown) {
        if (key === '') return v;
        if (key === 'when') return `date:${typeof v}`;
        return Array.isArray(this) ? `item:${String(v)}` : v;
      },
      undefined,
    ],
  ];

  it.each(CASES)('matches native for %s', (_, replacer, space) => {
    expect(impl.stringify(value, replacer, space)).toBe(nativeStringify(value, replacer as never, space));
  });

  it('a function replacer can replace the root value', () => {
    const replacer = (key: string, v: unknown) => (key === '' ? { wrapped: v } : v);
    expect(impl.stringify(5, replacer)).toBe(nativeStringify(5, replacer));
  });
});

describeFollowUp(2, 'reviver', () => {
  const text = '{"a":1,"b":{"c":2,"d":[3,4,{"e":5}]},"date":"2020-06-01T00:00:00.000Z","drop":true}';

  it('matches native results and call order', () => {
    const makeReviver = (calls: string[]) =>
      function (this: unknown, key: string, v: unknown) {
        calls.push(`${Array.isArray(this) ? 'array' : 'object'}:${key}`);
        if (key === 'drop') return undefined;
        if (key === 'date') return new Date(v as string);
        if (typeof v === 'number') return v * 10;
        return v;
      };
    const ours: string[] = [];
    const theirs: string[] = [];
    expect(impl.parse(text, makeReviver(ours))).toEqual(nativeParse(text, makeReviver(theirs)));
    expect(ours).toEqual(theirs);
  });

  it('the root key is "" and its return value is the result', () => {
    expect(impl.parse('[1,2]', (key, v) => (key === '' ? { root: v } : v))).toEqual({ root: [1, 2] });
  });
});
