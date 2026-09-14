// ⚠ Unverified: written before the reference solution. If a test looks wrong, trust the README.
import { expect, it } from 'vitest';
import { pickTarget } from '../../../test/target';
import * as Reference from './Reference';
import * as Solution from './Solution';

const { impl, describeTask, describeFollowUp } = pickTarget(Solution, Reference);

interface PersonShape {
  name: string;
  greet(): string;
}

function Person(this: PersonShape, name: string) {
  this.name = name;
}
Person.prototype.greet = function (this: PersonShape) {
  return `Hi, ${this.name}`;
};

describeTask('myNew', () => {
  it('links the prototype (Object.prototype if Ctor.prototype is not an object), binds this, forwards arguments and rejects non-functions', () => {
    const ada = impl.myNew(Person, 'Ada') as PersonShape;
    expect(Object.getPrototypeOf(ada)).toBe(Person.prototype);
    expect(ada.name).toBe('Ada');
    expect(ada.greet()).toBe('Hi, Ada');
    expect(Object.keys(ada)).toEqual(['name']);

    function Bare(this: { ok: boolean }) {
      this.ok = true;
    }
    (Bare as unknown as { prototype: unknown }).prototype = null;
    const bare = impl.myNew(Bare);
    expect(Object.getPrototypeOf(bare)).toBe(Object.prototype);
    expect(bare.ok).toBe(true);
    expect(() => impl.myNew({} as never)).toThrow(TypeError);
  });

  it('uses an object or function returned by the constructor, and ignores primitives and null', () => {
    const custom = { custom: true };
    const fn = () => 'fn';
    function ReturnsObject() {
      return custom;
    }
    function ReturnsFunction() {
      return fn;
    }
    function ReturnsPrimitive(this: { x: number }) {
      this.x = 1;
      return 42;
    }
    function ReturnsNull(this: { y: number }) {
      this.y = 2;
      return null;
    }
    expect(impl.myNew(ReturnsObject)).toBe(custom);
    expect(impl.myNew(ReturnsFunction)).toBe(fn);
    const p = impl.myNew(ReturnsPrimitive);
    expect(p).toEqual({ x: 1 });
    expect(Object.getPrototypeOf(p)).toBe(ReturnsPrimitive.prototype);
    const n = impl.myNew(ReturnsNull);
    expect(n).toEqual({ y: 2 });
  });
});

describeTask('myInstanceOf', () => {
  it('walks the whole prototype chain', () => {
    class Animal {}
    class Dog extends Animal {}
    const rex = new Dog();
    expect(impl.myInstanceOf(rex, Dog)).toBe(true);
    expect(impl.myInstanceOf(rex, Animal)).toBe(true);
    expect(impl.myInstanceOf(rex, Object)).toBe(true);
    expect(impl.myInstanceOf(rex, Array)).toBe(false);
    expect(impl.myInstanceOf([], Array)).toBe(true);
    expect(impl.myInstanceOf(() => {}, Function)).toBe(true);
    expect(impl.myInstanceOf(impl.myNew(Person, 'x'), Person)).toBe(true);
  });

  it('returns false for primitives, null, undefined and null-prototype objects, and throws for an invalid Ctor', () => {
    expect(impl.myInstanceOf(1, Number)).toBe(false);
    expect(impl.myInstanceOf('s', String)).toBe(false);
    expect(impl.myInstanceOf(Symbol('s'), Symbol)).toBe(false);
    expect(impl.myInstanceOf(null, Object)).toBe(false);
    expect(impl.myInstanceOf(undefined, Object)).toBe(false);
    expect(impl.myInstanceOf(Object.create(null), Object)).toBe(false);
    expect(impl.myInstanceOf(Object(1), Number)).toBe(true);

    expect(() => impl.myInstanceOf({}, {})).toThrow(TypeError);
    expect(() => impl.myInstanceOf({}, 42)).toThrow(TypeError);
    expect(() => impl.myInstanceOf({}, () => {})).toThrow(TypeError);
  });
});

describeTask('myObjectCreate', () => {
  it('creates an object with the given prototype, including null', () => {
    const proto = {
      hello() {
        return 'hello';
      },
    };
    const obj = impl.myObjectCreate(proto);
    expect(Object.getPrototypeOf(obj)).toBe(proto);
    expect(obj.hello()).toBe('hello');
    expect(Object.keys(obj)).toEqual([]);
    expect(Object.getPrototypeOf(impl.myObjectCreate(Object.prototype))).toBe(Object.prototype);

    const dict = impl.myObjectCreate(null);
    expect(Object.getPrototypeOf(dict)).toBeNull();
    expect('toString' in dict).toBe(false);
    expect('hasOwnProperty' in dict).toBe(false);
  });

  it('defines properties from descriptors with false defaults, and validates its arguments', () => {
    const obj = impl.myObjectCreate(null, {
      id: { value: 7 },
      label: { value: 'x', enumerable: true, writable: true },
      double: {
        get(this: { id: number }) {
          return this.id * 2;
        },
      },
    });
    expect(obj.id).toBe(7);
    expect(obj.double).toBe(14);
    expect(Object.getOwnPropertyDescriptor(obj, 'id')).toEqual({ value: 7, writable: false, enumerable: false, configurable: false });
    expect(Object.keys(obj)).toEqual(['label']);

    expect(() => impl.myObjectCreate(42 as never)).toThrow(TypeError);
    expect(() => impl.myObjectCreate(undefined as never)).toThrow(TypeError);
    expect(() => impl.myObjectCreate({}, null as never)).toThrow(TypeError);
  });
});

describeTask('myObjectAssign', () => {
  it('copies own enumerable string and symbol keys left to right, skipping inherited and non-enumerable ones', () => {
    const sym = Symbol('tag');
    const target: Record<PropertyKey, unknown> = { a: 1 };
    const result = impl.myObjectAssign(target, { b: 2, a: 9 }, null, undefined, { [sym]: 'yes', c: 3 }, { c: 4 });
    expect(result).toBe(target);
    expect(target).toEqual({ a: 9, b: 2, c: 4, [sym]: 'yes' });
    expect(target[sym]).toBe('yes');

    const source = Object.create({ inherited: true });
    source.own = 1;
    Object.defineProperty(source, 'hidden', { value: 2, enumerable: false });
    Object.defineProperty(source, Symbol('hiddenSym'), { value: 3, enumerable: false });
    expect(Reflect.ownKeys(impl.myObjectAssign({}, source))).toEqual(['own']);
  });

  it('invokes getters on sources and setters on the target', () => {
    let reads = 0;
    const source = {
      get lazy() {
        reads++;
        return 'computed';
      },
    };
    const writes: unknown[] = [];
    const target = {
      set lazy(v: unknown) {
        writes.push(v);
      },
    };
    impl.myObjectAssign(target, source);
    expect(reads).toBe(1);
    expect(writes).toEqual(['computed']);

    const copy = impl.myObjectAssign({}, source);
    expect(Object.getOwnPropertyDescriptor(copy, 'lazy')).toEqual({ value: 'computed', writable: true, enumerable: true, configurable: true });
  });

  it('handles primitive targets and sources, and throws for null targets and read-only properties', () => {
    expect(impl.myObjectAssign({}, 'ab', 5, true)).toEqual({ 0: 'a', 1: 'b' });
    const boxed = impl.myObjectAssign(1, { a: 1 });
    expect(typeof boxed).toBe('object');
    expect(boxed.a).toBe(1);
    expect(() => impl.myObjectAssign(null, { a: 1 })).toThrow(TypeError);
    expect(() => impl.myObjectAssign(undefined, { a: 1 })).toThrow(TypeError);
    expect(() => impl.myObjectAssign(Object.freeze({ a: 1 }), { a: 2 })).toThrow(TypeError);
  });
});

describeTask('myFlat', () => {
  it('flattens one level by default, respects depth, only flattens real arrays and returns a new array', () => {
    const input = [1, [2, [3, [4]]]];
    expect(impl.myFlat(input)).toEqual([1, 2, [3, [4]]]);
    expect(impl.myFlat(input, 2)).toEqual([1, 2, 3, [4]]);
    expect(impl.myFlat(input, Infinity)).toEqual([1, 2, 3, 4]);
    expect(impl.myFlat(input, undefined)).toEqual([1, 2, [3, [4]]]);
    expect(input).toEqual([1, [2, [3, [4]]]]);

    const arrayLike = { 0: 'x', length: 1 };
    const mixed = ['ab', arrayLike, [[]]];
    const out = impl.myFlat(mixed);
    expect(out).toEqual(['ab', arrayLike, []]);
    expect(out[1]).toBe(arrayLike);
    expect(out).not.toBe(mixed);
    expect(impl.myFlat([])).toEqual([]);
  });

  it('removes holes but keeps undefined and null', () => {
    const inner: unknown[] = [];
    inner[0] = 2;
    inner[2] = 3;
    const outer: unknown[] = [];
    outer[0] = 1;
    outer[1] = inner;
    outer[3] = undefined;
    outer[4] = null;
    const result = impl.myFlat(outer);
    expect(result).toHaveLength(5);
    expect(result).toEqual([1, 2, 3, undefined, null]);
    for (let i = 0; i < result.length; i++) expect(i in result).toBe(true);
  });

  it('depth 0, negative or NaN does not flatten but still drops holes', () => {
    const sparse: unknown[] = [];
    sparse[0] = [1];
    sparse[2] = 2;
    for (const depth of [0, -1, NaN]) {
      const out = impl.myFlat(sparse, depth);
      expect(out).toHaveLength(2);
      expect(out[0]).toEqual([1]);
      expect(out[1]).toBe(2);
    }
  });
});

describeFollowUp(1, 'Symbol.hasInstance', () => {
  it('uses a custom Symbol.hasInstance on objects and classes', () => {
    const Even = { [Symbol.hasInstance]: (n: unknown) => typeof n === 'number' && n % 2 === 0 };
    expect(impl.myInstanceOf(4, Even)).toBe(true);
    expect(impl.myInstanceOf(3, Even)).toBe(false);

    class ArrayLikeCheck {
      static [Symbol.hasInstance](value: unknown) {
        return Array.isArray(value) ? 1 : 0;
      }
    }
    expect(impl.myInstanceOf([], ArrayLikeCheck)).toBe(true);
    expect(impl.myInstanceOf({}, ArrayLikeCheck)).toBe(false);

    class Plain {}
    expect(impl.myInstanceOf(new Plain(), Plain)).toBe(true);
    expect(impl.myInstanceOf({}, Plain)).toBe(false);
  });
});

describeFollowUp(3, 'myFlatMap', () => {
  it('maps with index and thisArg, flattens one level, and skips holes', () => {
    const sparse: number[] = [];
    sparse[0] = 1;
    sparse[2] = 3;
    const ctx = { factor: 10 };
    const seen: number[] = [];
    const out = impl.myFlatMap(
      sparse,
      function (this: typeof ctx, value, index) {
        seen.push(index);
        return [value * this.factor, [value]];
      },
      ctx,
    );
    expect(seen).toEqual([0, 2]);
    expect(out).toEqual([10, [1], 30, [3]]);
    expect(impl.myFlatMap(['a b', 'c'], (s) => s.split(' '))).toEqual(['a', 'b', 'c']);
    expect(impl.myFlatMap([1, 2], (n) => n * 2)).toEqual([2, 4]);
  });
});
