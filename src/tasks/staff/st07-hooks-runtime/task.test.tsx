// ⚠ Unverified: written before the reference solution. If a test looks wrong, trust the README.
import { expect, it, vi } from 'vitest';
import { pickTarget } from '../../../test/target';
import * as Reference from './Reference';
import * as Solution from './Solution';
import type { Dispatch } from './types';

const { impl, describeTask, describeFollowUp } = pickTarget(Solution, Reference);

describeTask('Hooks runtime', () => {
  it('renders synchronously and rerender() passes new props', () => {
    const rt = impl.createRuntime();
    const Hello = ({ name }: { name: string }) => `Hello ${name}`;
    const handle = rt.render(Hello, { name: 'Ada' });
    expect(handle.getOutput()).toBe('Hello Ada');
    expect(handle.rerender({ name: 'Grace' })).toBe('Hello Grace');
    expect(handle.getOutput()).toBe('Hello Grace');
  });

  it('useState keeps state across renders, initialises lazily once, and applies updates on flush', async () => {
    const rt = impl.createRuntime();
    const init = vi.fn(() => 10);
    let setCount!: Dispatch<number>;
    const Counter = () => {
      const [count, set] = rt.useState(init);
      setCount = set;
      return `count:${count}`;
    };
    const handle = rt.render(Counter, {});
    expect(handle.getOutput()).toBe('count:10');

    setCount(11);
    expect(handle.getOutput()).toBe('count:10'); // not synchronous
    await rt.flush();
    expect(handle.getOutput()).toBe('count:11');

    handle.rerender({});
    expect(handle.getOutput()).toBe('count:11');
    expect(init).toHaveBeenCalledTimes(1);
  });

  it('batches several updates in the same tick into one re-render, applying functional updates in order', async () => {
    const rt = impl.createRuntime();
    let renders = 0;
    let setCount!: Dispatch<number>;
    const setters: Dispatch<number>[] = [];
    const Counter = () => {
      renders++;
      const [count, set] = rt.useState(0);
      setCount = set;
      setters.push(set);
      return count;
    };
    const handle = rt.render(Counter, {});
    setCount((c) => c + 1);
    setCount((c) => c + 1);
    setCount((c) => c * 10);
    await rt.flush();
    expect(handle.getOutput()).toBe(20);
    expect(renders).toBe(2);
    expect(setters[1]).toBe(setters[0]); // setter identity is stable

    setCount(20); // same value: no re-render
    await rt.flush();
    expect(renders).toBe(2);
  });

  it('runs effects after render and re-runs them only when deps change, cleaning up first', () => {
    const rt = impl.createRuntime();
    const log: string[] = [];
    const Comp = ({ id }: { id: number }) => {
      rt.useEffect(() => {
        log.push(`effect ${id}`);
        return () => log.push(`cleanup ${id}`);
      }, [id]);
      log.push(`render ${id}`);
      return id;
    };
    const handle = rt.render(Comp, { id: 1 });
    expect(log).toEqual(['render 1', 'effect 1']);

    handle.rerender({ id: 1 });
    expect(log).toEqual(['render 1', 'effect 1', 'render 1']);

    handle.rerender({ id: 2 });
    expect(log).toEqual(['render 1', 'effect 1', 'render 1', 'render 2', 'cleanup 1', 'effect 2']);

    handle.unmount();
    expect(log.at(-1)).toBe('cleanup 2');
  });

  it('compares deps with Object.is; no deps means every render and [] means once', () => {
    const rt = impl.createRuntime();
    const everyRender = vi.fn();
    const once = vi.fn();
    const nan = vi.fn();
    const objectDep = vi.fn();
    const Comp = () => {
      rt.useEffect(() => everyRender());
      rt.useEffect(() => once(), []);
      rt.useEffect(() => nan(), [NaN]);
      rt.useEffect(() => objectDep(), [{}]);
      return null;
    };
    const handle = rt.render(Comp, {});
    handle.rerender({});
    handle.rerender({});
    expect(everyRender).toHaveBeenCalledTimes(3);
    expect(once).toHaveBeenCalledTimes(1);
    expect(nan).toHaveBeenCalledTimes(1);
    expect(objectDep).toHaveBeenCalledTimes(3);
  });

  it('flush() waits for cascading updates scheduled by effects', async () => {
    const rt = impl.createRuntime();
    const Stepper = () => {
      const [step, setStep] = rt.useState(0);
      rt.useEffect(() => {
        if (step < 3) setStep(step + 1);
      }, [step]);
      return `step ${step}`;
    };
    const handle = rt.render(Stepper, {});
    expect(handle.getOutput()).toBe('step 0');
    await rt.flush();
    expect(handle.getOutput()).toBe('step 3');
  });

  it('useMemo recomputes only when deps change; useRef keeps one object and does not re-render', async () => {
    const rt = impl.createRuntime();
    const factory = vi.fn((n: number) => ({ doubled: n * 2 }));
    let renders = 0;
    const refs: { current: number }[] = [];
    const memos: { doubled: number }[] = [];
    const Comp = ({ n }: { n: number }) => {
      renders++;
      const memo = rt.useMemo(() => factory(n), [n]);
      const ref = rt.useRef(0);
      memos.push(memo);
      refs.push(ref);
      return memo.doubled;
    };
    const handle = rt.render(Comp, { n: 1 });
    handle.rerender({ n: 1 });
    expect(memos[1]).toBe(memos[0]);
    expect(factory).toHaveBeenCalledTimes(1);

    expect(handle.rerender({ n: 2 })).toBe(4);
    expect(factory).toHaveBeenCalledTimes(2);

    expect(refs[2]).toBe(refs[0]);
    refs[0].current = 42;
    await rt.flush();
    expect(renders).toBe(3);
    handle.rerender({ n: 2 });
    expect(refs[3].current).toBe(42);
  });

  it('keeps hook state separate for each rendered instance', async () => {
    const rt = impl.createRuntime();
    const setters: Record<string, Dispatch<number>> = {};
    const Counter = ({ name }: { name: string }) => {
      const [count, set] = rt.useState(0);
      setters[name] = set;
      return `${name}:${count}`;
    };
    const a = rt.render(Counter, { name: 'a' });
    const b = rt.render(Counter, { name: 'b' });
    setters.a(5);
    await rt.flush();
    expect(a.getOutput()).toBe('a:5');
    expect(b.getOutput()).toBe('b:0');
  });

  it('throws when a hook is called outside of render', () => {
    const rt = impl.createRuntime();
    expect(() => rt.useState(0)).toThrow();
    expect(() => rt.useRef(0)).toThrow();
  });

  it('ignores state updates after unmount', async () => {
    const rt = impl.createRuntime();
    let setValue!: Dispatch<string>;
    let renders = 0;
    const Comp = () => {
      renders++;
      const [value, set] = rt.useState('initial');
      setValue = set;
      return value;
    };
    const handle = rt.render(Comp, {});
    handle.unmount();
    expect(() => setValue('late')).not.toThrow();
    await rt.flush();
    expect(renders).toBe(1);
    expect(handle.getOutput()).toBe('initial');
  });
});

describeFollowUp(1, 'rules-of-hooks detection', () => {
  it('throws a descriptive error when the number of hooks changes between renders', () => {
    const rt = impl.createRuntime();
    const Comp = ({ extra }: { extra: boolean }) => {
      rt.useState(0);
      if (extra) rt.useRef(null);
      return null;
    };
    const handle = rt.render(Comp, { extra: false });
    expect(() => handle.rerender({ extra: true })).toThrow(/hook/i);
  });
});
