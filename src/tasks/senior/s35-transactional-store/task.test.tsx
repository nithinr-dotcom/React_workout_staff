// ⚠ Unverified: written before the reference solution. If a test looks wrong, trust the README.
import { expect, it } from 'vitest';
import { pickTarget } from '../../../test/target';
import * as Reference from './Reference';
import * as Solution from './Solution';

const { impl, describeTask, describeFollowUp } = pickTarget(Solution, Reference);

describeTask('Transactional KV store', () => {
  it('gets, sets, overwrites and deletes without transactions', () => {
    const store = impl.createStore();
    expect(store.get('a')).toBeNull();
    store.set('a', '10');
    expect(store.get('a')).toBe('10');
    store.set('a', '20');
    expect(store.get('a')).toBe('20');
    expect(store.delete('a')).toBe(true);
    expect(store.get('a')).toBeNull();
    expect(store.delete('a')).toBe(false);
  });

  it('counts keys holding a value across set, overwrite and delete', () => {
    const store = impl.createStore();
    expect(store.count('10')).toBe(0);
    store.set('a', '10');
    store.set('b', '10');
    store.set('c', '20');
    expect(store.count('10')).toBe(2);
    store.set('a', '10'); // same value again
    expect(store.count('10')).toBe(2);
    store.set('b', '20');
    expect(store.count('10')).toBe(1);
    expect(store.count('20')).toBe(2);
    store.delete('c');
    expect(store.count('20')).toBe(1);
  });

  it('throws NO TRANSACTION for commit/rollback with nothing open, without side effects', () => {
    const store = impl.createStore();
    store.set('a', '1');
    expect(() => store.rollback()).toThrow('NO TRANSACTION');
    expect(() => store.commit()).toThrow('NO TRANSACTION');
    expect(store.get('a')).toBe('1');
    expect(store.depth()).toBe(0);
  });

  it('rolls back sets, overwrites and deletes made in a transaction', () => {
    const store = impl.createStore();
    store.set('a', '10');
    store.set('b', '10');
    store.begin();
    expect(store.depth()).toBe(1);
    store.set('a', '20');
    store.delete('b');
    store.set('c', '30');
    expect(store.get('a')).toBe('20');
    expect(store.get('b')).toBeNull();
    expect(store.count('10')).toBe(0);
    store.rollback();
    expect(store.depth()).toBe(0);
    expect(store.get('a')).toBe('10');
    expect(store.get('b')).toBe('10');
    expect(store.get('c')).toBeNull();
    expect(store.count('10')).toBe(2);
    expect(store.count('30')).toBe(0);
  });

  it('restores the original value when a key is set then deleted in one transaction', () => {
    const store = impl.createStore();
    store.set('a', 'orig');
    store.begin();
    store.set('a', 'temp');
    expect(store.delete('a')).toBe(true);
    expect(store.delete('a')).toBe(false);
    store.rollback();
    expect(store.get('a')).toBe('orig');
    expect(store.count('orig')).toBe(1);
    expect(store.count('temp')).toBe(0);
  });

  it('supports nested rollbacks level by level', () => {
    const store = impl.createStore();
    store.begin();
    store.set('a', '10');
    store.begin();
    store.set('a', '20');
    store.begin();
    store.delete('a');
    expect(store.depth()).toBe(3);
    expect(store.get('a')).toBeNull();
    store.rollback();
    expect(store.get('a')).toBe('20');
    store.rollback();
    expect(store.get('a')).toBe('10');
    store.rollback();
    expect(store.get('a')).toBeNull();
    expect(() => store.rollback()).toThrow('NO TRANSACTION');
  });

  it('commit merges into the parent, so a parent rollback undoes committed changes', () => {
    const store = impl.createStore();
    store.set('a', '1');
    store.begin();
    store.set('b', '2');
    store.begin();
    store.set('a', '3');
    store.commit();
    expect(store.depth()).toBe(1);
    expect(store.get('a')).toBe('3');
    expect(store.get('b')).toBe('2');
    store.rollback();
    expect(store.depth()).toBe(0);
    expect(store.get('a')).toBe('1');
    expect(store.get('b')).toBeNull();
    expect(store.count('3')).toBe(0);
  });

  it('committing the outermost transaction makes changes permanent', () => {
    const store = impl.createStore();
    store.begin();
    store.set('a', '10');
    store.begin();
    store.set('b', '10');
    store.commit();
    store.commit();
    expect(store.depth()).toBe(0);
    expect(store.get('a')).toBe('10');
    expect(store.count('10')).toBe(2);
    expect(() => store.rollback()).toThrow('NO TRANSACTION');
    expect(store.get('b')).toBe('10');
  });

  it('keeps count consistent through mixed nested commit and rollback', () => {
    const store = impl.createStore();
    store.set('x', 'v');
    store.set('y', 'v');
    store.begin();
    store.set('x', 'w'); // v:1 w:1
    store.begin();
    store.set('z', 'v'); // v:2
    store.delete('y'); // v:1
    store.rollback(); // v:1 w:1
    expect(store.count('v')).toBe(1);
    expect(store.count('w')).toBe(1);
    store.begin();
    store.set('y', 'w'); // v:0 w:2
    store.commit();
    expect(store.count('v')).toBe(0);
    expect(store.count('w')).toBe(2);
    store.rollback();
    expect(store.count('v')).toBe(2);
    expect(store.count('w')).toBe(0);
  });

  it('handles deep nesting with a change only at the innermost level', () => {
    const store = impl.createStore();
    store.set('k', 'base');
    for (let i = 0; i < 1000; i++) store.begin();
    store.set('k', 'deep');
    expect(store.get('k')).toBe('deep');
    store.commit();
    expect(store.get('k')).toBe('deep');
    for (let i = 0; i < 999; i++) store.rollback();
    expect(store.depth()).toBe(0);
    expect(store.get('k')).toBe('base');
  });

  it('keeps separate stores independent', () => {
    const one = impl.createStore();
    const two = impl.createStore();
    one.set('a', '1');
    one.begin();
    expect(two.get('a')).toBeNull();
    expect(two.depth()).toBe(0);
    expect(() => two.commit()).toThrow('NO TRANSACTION');
  });
});

describeFollowUp(1, 'command interpreter', () => {
  it('executes the text protocol', () => {
    const store = impl.createStore();
    const run = (line: string) => impl.execute(store, line);
    expect(run('GET a')).toBe('NULL');
    expect(run('SET a 10')).toBeNull();
    expect(run('GET a')).toBe('10');
    expect(run('COUNT 10')).toBe('1');
    expect(run('BEGIN')).toBeNull();
    expect(run('DELETE a')).toBeNull();
    expect(run('GET a')).toBe('NULL');
    expect(run('ROLLBACK')).toBeNull();
    expect(run('GET a')).toBe('10');
    expect(run('COMMIT')).toBe('NO TRANSACTION');
    expect(run('ROLLBACK')).toBe('NO TRANSACTION');
  });
});
