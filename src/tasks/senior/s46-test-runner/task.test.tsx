// ⚠ Unverified: written before the reference solution. If a test looks wrong, trust the README.
// Note: `expect` below is Vitest's. The expect you are building is always called as `impl.expect`.
import { expect, it } from 'vitest';
import { pickTarget } from '../../../test/target';
import * as Reference from './Reference';
import * as Solution from './Solution';

const { impl, describeTask, describeFollowUp } = pickTarget(Solution, Reference);

const tick = () => new Promise((r) => setTimeout(r, 0));

describeTask('createTestRunner: registration, run() and the report', () => {
  it('reports passing and failing tests with "suite > test" names, in declaration order', async () => {
    const r = impl.createTestRunner();
    const boom = new Error('boom');
    r.it('top level', () => {});
    r.describe('cart', () => {
      r.it('adds items', () => {});
      r.describe('totals', () => {
        r.it('fails', () => {
          throw boom;
        });
      });
      r.it('removes items', () => {});
    });

    const report = await r.run();
    expect(report.passed).toBe(3);
    expect(report.failed).toBe(1);
    expect(report.results.map(({ name, status }) => ({ name, status }))).toEqual([
      { name: 'top level', status: 'passed' },
      { name: 'cart > adds items', status: 'passed' },
      { name: 'cart > totals > fails', status: 'failed' },
      { name: 'cart > removes items', status: 'passed' },
    ]);
    expect(report.results[2].error).toBe(boom);
    expect(report.results[0].error).toBeUndefined();
  });

  it('runs tests one at a time, awaiting async tests, and fails a test whose promise rejects', async () => {
    const r = impl.createTestRunner();
    const log: string[] = [];
    const rejection = new Error('rejected');
    r.it('slow', async () => {
      log.push('slow start');
      await new Promise((res) => setTimeout(res, 20));
      log.push('slow end');
    });
    r.it('fast', () => {
      log.push('fast');
    });
    r.it('rejects', async () => {
      await tick();
      throw rejection;
    });

    const pending = r.run();
    expect(pending).toBeInstanceOf(Promise);
    const report = await pending;
    expect(log).toEqual(['slow start', 'slow end', 'fast']);
    expect(report.results.map((t) => t.status)).toEqual(['passed', 'passed', 'failed']);
    expect(report.results[2].error).toBe(rejection);
  });

  it('scopes beforeEach/afterEach to their describe block: outer before inner, inner after before outer', async () => {
    const r = impl.createTestRunner();
    const log: string[] = [];
    r.beforeEach(() => {
      log.push('root before');
    });
    r.describe('outer', () => {
      r.beforeEach(async () => {
        await tick();
        log.push('outer before');
      });
      r.afterEach(() => {
        log.push('outer after');
      });
      r.describe('inner', () => {
        r.beforeEach(() => {
          log.push('inner before');
        });
        r.afterEach(async () => {
          await tick();
          log.push('inner after');
        });
        r.it('deep', () => {
          log.push('TEST deep');
        });
      });
      r.it('shallow', () => {
        log.push('TEST shallow');
      });
    });
    r.describe('sibling', () => {
      r.it('isolated', () => {
        log.push('TEST isolated');
      });
    });

    await r.run();
    expect(log).toEqual([
      'root before',
      'outer before',
      'inner before',
      'TEST deep',
      'inner after',
      'outer after',
      'root before',
      'outer before',
      'TEST shallow',
      'outer after',
      'root before',
      'TEST isolated',
    ]);
  });

  it('still runs afterEach when a test fails, and fails the test without running it when beforeEach throws', async () => {
    const r = impl.createTestRunner();
    const log: string[] = [];
    const hookError = new Error('db down');
    let body = 0;
    r.describe('failing test', () => {
      r.afterEach(() => {
        log.push('cleanup');
      });
      r.it('throws', () => {
        throw new Error('nope');
      });
    });
    r.describe('failing hook', () => {
      r.beforeEach(() => {
        throw hookError;
      });
      r.it('never runs', () => {
        body++;
      });
    });
    r.it('unaffected', () => {});

    const report = await r.run();
    expect(log).toEqual(['cleanup']);
    expect(body).toBe(0);
    expect(report.results.map((t) => t.status)).toEqual(['failed', 'failed', 'passed']);
    expect(report.results[1].error).toBe(hookError);
  });

  it('fails a test that exceeds its timeout and moves on to the next test', async () => {
    const r = impl.createTestRunner({ timeout: 30 });
    r.it('hangs forever', () => new Promise<void>(() => {}));
    r.it('quick', () => {});
    r.it('slow, with its own longer timeout', () => new Promise<void>((res) => setTimeout(res, 60)), 200);

    const report = await r.run();
    expect(report.results.map((t) => t.status)).toEqual(['failed', 'passed', 'passed']);
    expect(report.results[0].error).toBeInstanceOf(Error);
    expect((report.results[0].error as Error).message).toMatch(/timed out/i);
  });

  it('reports a failing impl.expect inside a test as a failure', async () => {
    const r = impl.createTestRunner();
    r.it('math works', () => impl.expect(1 + 1).toBe(2));
    r.it('math is broken', () => impl.expect(1 + 1).toBe(3));
    const report = await r.run();
    expect(report).toMatchObject({ passed: 1, failed: 1 });
    expect(report.results[1].error).toBeInstanceOf(Error);
  });
});

describeTask('expect', () => {
  it('toBe uses Object.is; toEqual compares deeply', () => {
    expect(() => impl.expect(1).toBe(1)).not.toThrow();
    expect(() => impl.expect(NaN).toBe(NaN)).not.toThrow();
    expect(() => impl.expect({ a: 1 }).toBe({ a: 1 })).toThrow();
    expect(() => impl.expect('1').toBe(1)).toThrow();

    expect(() => impl.expect({ a: [1, { b: 'x' }], c: null }).toEqual({ a: [1, { b: 'x' }], c: null })).not.toThrow();
    expect(() => impl.expect([1, 2, 3]).toEqual([1, 2, 3])).not.toThrow();
    expect(() => impl.expect({ a: [1, { b: 'x' }] }).toEqual({ a: [1, { b: 'y' }] })).toThrow();
    expect(() => impl.expect({ a: 1 }).toEqual({ a: 1, b: 2 })).toThrow();
    expect(() => impl.expect([1, 2]).toEqual([1, 2, 3])).toThrow();
    expect(() => impl.expect([1]).toEqual({ 0: 1 })).toThrow();
  });

  it('toThrow accepts no argument, a message substring, a RegExp or an error class', () => {
    class ValidationError extends Error {}
    const throwsValidation = () => {
      throw new ValidationError('email is invalid');
    };
    expect(() => impl.expect(throwsValidation).toThrow()).not.toThrow();
    expect(() => impl.expect(throwsValidation).toThrow('invalid')).not.toThrow();
    expect(() => impl.expect(throwsValidation).toThrow(/^email/)).not.toThrow();
    expect(() => impl.expect(throwsValidation).toThrow(ValidationError)).not.toThrow();

    expect(() => impl.expect(() => {}).toThrow()).toThrow();
    expect(() => impl.expect(throwsValidation).toThrow('password')).toThrow();
    expect(() => impl.expect(throwsValidation).toThrow(TypeError)).toThrow();
  });

  it('toContain works on arrays and strings, and .not inverts every matcher', () => {
    const item = { id: 1 };
    expect(() => impl.expect([1, item, 'x']).toContain(item)).not.toThrow();
    expect(() => impl.expect('hello world').toContain('lo w')).not.toThrow();
    expect(() => impl.expect([{ id: 1 }]).toContain({ id: 1 })).toThrow();
    expect(() => impl.expect('hello').toContain('bye')).toThrow();

    expect(() => impl.expect(1).not.toBe(2)).not.toThrow();
    expect(() => impl.expect(1).not.toBe(1)).toThrow();
    expect(() => impl.expect({ a: 1 }).not.toEqual({ a: 1 })).toThrow();
    expect(() => impl.expect([1]).not.toContain(2)).not.toThrow();
    expect(() => impl.expect(() => {}).not.toThrow()).not.toThrow();
    expect(() =>
      impl.expect(() => {
        throw new Error('x');
      }).not.toThrow(),
    ).toThrow();
  });
});

describeTask('spyOn', () => {
  it('records calls, calls through with `this`, supports mockImplementation, and restore puts the original back', () => {
    const account = {
      balance: 10,
      deposit(amount: number, note?: string) {
        this.balance += amount;
        return `${note ?? 'deposit'}: ${this.balance}`;
      },
    };
    const original = account.deposit;
    const spy = impl.spyOn(account, 'deposit');
    expect(account.deposit).not.toBe(original);

    expect(account.deposit(5, 'salary')).toBe('salary: 15');
    account.deposit(1);
    expect(spy.calls).toEqual([[5, 'salary'], [1]]);
    expect(account.balance).toBe(16);

    const returned = spy.mockImplementation(() => 'mocked');
    expect(returned).toBe(spy);
    expect(account.deposit(100)).toBe('mocked');
    expect(account.balance).toBe(16);
    expect(spy.calls).toHaveLength(3);

    spy.restore();
    expect(account.deposit).toBe(original);
    expect(account.deposit(4)).toBe('deposit: 20');
    expect(spy.calls).toHaveLength(3);
  });
});

describeFollowUp(1, 'skip & only', () => {
  it('it.skip and describe.skip report "skipped" without running', async () => {
    const r = impl.createTestRunner();
    let ran = 0;
    r.it.skip('skipped test', () => {
      ran++;
    });
    r.describe.skip('skipped suite', () => {
      r.it('inside', () => {
        ran++;
      });
    });
    r.it('runs', () => {});
    const report = await r.run();
    expect(ran).toBe(0);
    expect(report).toMatchObject({ passed: 1, failed: 0, skipped: 2 });
    expect(report.results.map((t) => t.status)).toEqual(['skipped', 'skipped', 'passed']);
  });

  it('when any it.only or describe.only exists, only those run', async () => {
    const r = impl.createTestRunner();
    const ran: string[] = [];
    r.it('normal', () => {
      ran.push('normal');
    });
    r.it.only('focused', () => {
      ran.push('focused');
    });
    r.describe.only('focused suite', () => {
      r.it('a', () => {
        ran.push('suite a');
      });
    });
    const report = await r.run();
    expect(ran).toEqual(['focused', 'suite a']);
    expect(report.results.find((t) => t.name === 'normal')?.status).toBe('skipped');
  });
});

describeFollowUp(2, 'spy matchers', () => {
  it('toHaveBeenCalled, toHaveBeenCalledTimes and toHaveBeenCalledWith (deep)', () => {
    const api = { save: (_user: { id: number }) => true };
    const spy = impl.spyOn(api, 'save');
    expect(() => impl.expect(spy).toHaveBeenCalled()).toThrow();
    expect(() => impl.expect(spy).not.toHaveBeenCalled()).not.toThrow();
    api.save({ id: 1 });
    api.save({ id: 2 });
    expect(() => impl.expect(spy).toHaveBeenCalled()).not.toThrow();
    expect(() => impl.expect(spy).toHaveBeenCalledTimes(2)).not.toThrow();
    expect(() => impl.expect(spy).toHaveBeenCalledTimes(1)).toThrow();
    expect(() => impl.expect(spy).toHaveBeenCalledWith({ id: 2 })).not.toThrow();
    expect(() => impl.expect(spy).toHaveBeenCalledWith({ id: 3 })).toThrow();
    spy.restore();
  });
});
