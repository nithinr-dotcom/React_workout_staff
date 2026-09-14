import { useState, type ReactNode } from 'react';
import type { Polyfills2Module } from './types';

type Row = { label: string; yours: () => unknown; native: () => unknown };

function show(fn: () => unknown): string {
  try {
    const v = fn();
    if (typeof v === 'function') return `[Function ${v.name || 'anonymous'}]`;
    if (typeof v === 'symbol') return v.toString();
    if (v === undefined) return 'undefined';
    return JSON.stringify(v);
  } catch (e) {
    return `throws ${(e as Error).name}`;
  }
}

function Table({ title, rows, children }: { title: string; rows: Row[]; children?: ReactNode }) {
  return (
    <section style={{ border: '1px solid #d0d5dd', borderRadius: 8, padding: 12, display: 'grid', gap: 8 }}>
      <h3 style={{ margin: 0, fontFamily: 'monospace' }}>{title}</h3>
      {children}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', fontFamily: 'monospace', fontSize: 13, width: '100%' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: 4 }}>case</th>
              <th style={{ textAlign: 'left', padding: 4 }}>yours</th>
              <th style={{ textAlign: 'left', padding: 4 }}>native</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const yours = show(r.yours);
              const native = show(r.native);
              return (
                <tr key={r.label} style={{ borderTop: '1px solid #eaecf0' }}>
                  <td style={{ padding: 4 }}>{r.label}</td>
                  <td style={{ padding: 4, color: yours === native ? '#027a48' : '#b91c1c' }}>{yours}</td>
                  <td style={{ padding: 4 }}>{native}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Point(this: { x: number; y: number }, x: number, y: number) {
  this.x = x;
  this.y = y;
}
function ReturnsObject() {
  return { replaced: true };
}
class Animal {}
class Dog extends Animal {}

export default function Playground({ impl }: { impl: Polyfills2Module }) {
  const [flatJson, setFlatJson] = useState('[1, [2, [3, [4, [5]]]], "six"]');
  const [depth, setDepth] = useState('1');

  const parsedDepth = depth === 'Infinity' ? Infinity : Number(depth);
  const parse = () => JSON.parse(flatJson);

  return (
    <div style={{ fontFamily: 'system-ui', display: 'grid', gap: 12, maxWidth: 680 }}>
      <p style={{ margin: 0 }}>Green means your result matches the native one.</p>

      <Table
        title="myNew(Ctor, ...args)"
        rows={[
          { label: 'Point(1, 2)', yours: () => impl.myNew(Point, 1, 2), native: () => new (Point as never as new (x: number, y: number) => object)(1, 2) },
          {
            label: 'proto is Point.prototype',
            yours: () => Object.getPrototypeOf(impl.myNew(Point, 1, 2)) === Point.prototype,
            native: () => true,
          },
          { label: 'ctor returns object', yours: () => impl.myNew(ReturnsObject), native: () => new (ReturnsObject as never as new () => object)() },
        ]}
      />

      <Table
        title="myInstanceOf(obj, Ctor)"
        rows={[
          { label: 'new Dog(), Animal', yours: () => impl.myInstanceOf(new Dog(), Animal), native: () => new Dog() instanceof Animal },
          { label: '1, Number', yours: () => impl.myInstanceOf(1, Number), native: () => (1 as unknown) instanceof Number },
          { label: 'Object.create(null), Object', yours: () => impl.myInstanceOf(Object.create(null), Object), native: () => Object.create(null) instanceof Object },
          { label: '{}, arrow fn', yours: () => impl.myInstanceOf({}, () => {}), native: () => ({}) instanceof (((() => {}) as unknown) as typeof Object) },
        ]}
      />

      <Table
        title="myObjectCreate(proto, props?)"
        rows={[
          { label: 'proto(null) === null', yours: () => Object.getPrototypeOf(impl.myObjectCreate(null)) === null, native: () => true },
          { label: "'toString' in create(null)", yours: () => 'toString' in impl.myObjectCreate(null), native: () => 'toString' in Object.create(null) },
          {
            label: 'keys with { a: { value: 1 } }',
            yours: () => Object.keys(impl.myObjectCreate({}, { a: { value: 1 } })),
            native: () => Object.keys(Object.create({}, { a: { value: 1 } })),
          },
          { label: 'create(42)', yours: () => impl.myObjectCreate(42 as never), native: () => Object.create(42 as never) },
        ]}
      />

      <Table
        title="myObjectAssign(target, ...sources)"
        rows={[
          { label: "{}, { a: 1 }, null, 'hi'", yours: () => impl.myObjectAssign({}, { a: 1 }, null, 'hi'), native: () => Object.assign({}, { a: 1 }, null, 'hi') },
          {
            label: 'getter is evaluated',
            yours: () => Object.getOwnPropertyDescriptor(impl.myObjectAssign({}, { get g() { return 42; } }), 'g'),
            native: () => Object.getOwnPropertyDescriptor(Object.assign({}, { get g() { return 42; } }), 'g'),
          },
          { label: 'null target', yours: () => impl.myObjectAssign(null, {}), native: () => Object.assign(null as never, {}) },
        ]}
      />

      <Table
        title="myFlat(arr, depth)"
        rows={[{ label: `depth ${depth}`, yours: () => impl.myFlat(parse(), parsedDepth), native: () => parse().flat(parsedDepth) }]}
      >
        <label>
          arr (JSON) <input style={{ fontFamily: 'monospace', padding: 6, width: '100%', boxSizing: 'border-box' }} value={flatJson} onChange={(e) => setFlatJson(e.target.value)} />
        </label>
        <label>
          depth (number or Infinity) <input style={{ fontFamily: 'monospace', padding: 6, width: 100 }} value={depth} onChange={(e) => setDepth(e.target.value)} />
        </label>
      </Table>
    </div>
  );
}
