// ⚠ Unverified: written before the reference solution. If a test looks wrong, trust the README.
import { render } from '@testing-library/react';
import { expect, it } from 'vitest';
import { pickTarget } from '../../../test/target';
import * as Reference from './Reference';
import * as Solution from './Solution';
import type { HighlighterModule } from './types';

const { impl, describeTask, describeFollowUp } = pickTarget(Solution as unknown as HighlighterModule, Reference);
const Highlighter = impl.default;

const m = (text: string) => ({ text, match: true });
const n = (text: string) => ({ text, match: false });

const marks = (container: HTMLElement) => [...container.querySelectorAll('mark')].map((el) => el.textContent);

describeTask('highlight()', () => {
  it('splits text into ordered segments, case-insensitively, keeping original casing', () => {
    expect(impl.highlight('React Hooks and react-dom', ['react', 'hook'])).toEqual([
      m('React'),
      n(' '),
      m('Hook'),
      n('s and '),
      m('react'),
      n('-dom'),
    ]);
  });

  it('returns a single non-match segment when nothing matches, and [] for empty text', () => {
    expect(impl.highlight('Nothing to see', ['zebra'])).toEqual([n('Nothing to see')]);
    expect(impl.highlight('', ['a'])).toEqual([]);
  });

  it('ignores empty and whitespace-only queries', () => {
    expect(impl.highlight('abc', [])).toEqual([n('abc')]);
    expect(impl.highlight('a b c', ['', '  '])).toEqual([n('a b c')]);
    expect(impl.highlight('a b c', ['', 'b'])).toEqual([n('a '), m('b'), n(' c')]);
  });

  it('merges overlapping matches from different queries', () => {
    expect(impl.highlight('abcdef', ['abc', 'bcd'])).toEqual([m('abcd'), n('ef')]);
    expect(impl.highlight('state management', ['state', 'tat', 'e man'])).toEqual([m('state man'), n('agement')]);
  });

  it('merges adjacent matches and handles matches at both ends', () => {
    expect(impl.highlight('foobar', ['foo', 'bar'])).toEqual([m('foobar')]);
    expect(impl.highlight('xfoo-barx', ['x'])).toEqual([m('x'), n('foo-bar'), m('x')]);
  });

  it('finds every occurrence of a query, including ones that overlap themselves', () => {
    expect(impl.highlight('aaaa', ['aa'])).toEqual([m('aaaa')]);
    expect(impl.highlight('banana', ['ana'])).toEqual([n('b'), m('anana')]);
    expect(impl.highlight('la la land', ['la'])).toEqual([m('la'), n(' '), m('la'), n(' '), m('la'), n('nd')]);
  });

  it('treats regex special characters literally', () => {
    expect(impl.highlight('I love C++ and C#', ['c++'])).toEqual([n('I love '), m('C++'), n(' and C#')]);
    expect(impl.highlight('axb a.b', ['a.b'])).toEqual([n('axb '), m('a.b')]);
    expect(impl.highlight('Price: $5.00 (approx)', ['$5.00', '(approx)'])).toEqual([
      n('Price: '),
      m('$5.00'),
      n(' '),
      m('(approx)'),
    ]);
    expect(impl.highlight('match .* only', ['.*'])).toEqual([n('match '), m('.*'), n(' only')]);
    expect(impl.highlight('a\\b [x] {2} ^|/', ['\\', '[x]', '{2}', '^|/'])).toEqual([
      n('a'),
      m('\\'),
      n('b '),
      m('[x]'),
      n(' '),
      m('{2}'),
      n(' '),
      m('^|/'),
    ]);
  });

  it('handles duplicate and nested queries', () => {
    expect(impl.highlight('React', ['react', 'act', 'react', 'REACT'])).toEqual([m('React')]);
    expect(impl.highlight('hi', ['hello'])).toEqual([n('hi')]);
  });
});

describeTask('<Highlighter />', () => {
  it('wraps matches in <mark> and keeps the exact text content', () => {
    const { container } = render(<Highlighter text="Use React hooks in React apps" query={['react']} />);
    expect(container.textContent).toBe('Use React hooks in React apps');
    expect(marks(container)).toEqual(['React', 'React']);
  });

  it('splits a string query on whitespace', () => {
    const { container } = render(<Highlighter text="useState and useEffect hooks" query="  usestate   HOOKS " />);
    expect(container.textContent).toBe('useState and useEffect hooks');
    expect(marks(container)).toEqual(['useState', 'hooks']);
  });

  it('renders no <mark> when nothing matches or the query is empty, and updates when query changes', () => {
    const { container, rerender } = render(<Highlighter text="Billing and invoices" query="" />);
    expect(marks(container)).toEqual([]);
    expect(container.textContent).toBe('Billing and invoices');
    rerender(<Highlighter text="Billing and invoices" query="refund" />);
    expect(marks(container)).toEqual([]);
    rerender(<Highlighter text="Billing and invoices" query="in" />);
    expect(marks(container)).toEqual(['in', 'in']);
    expect(container.textContent).toBe('Billing and invoices');
  });

  it('renders text literally (no HTML injection)', () => {
    const { container } = render(<Highlighter text={'<b>bold</b> text'} query="bold" />);
    expect(container.querySelector('b')).toBeNull();
    expect(container.textContent).toBe('<b>bold</b> text');
    expect(marks(container)).toEqual(['bold']);
  });
});

describeFollowUp(2, 'highlightInDom with TreeWalker', () => {
  it('wraps matches inside text nodes without changing structure or text', () => {
    const root = document.createElement('div');
    root.innerHTML = '<p>Use <b id="r">React</b> hooks. react is <a href="/x">great</a>, reactive!</p>';
    const bold = root.querySelector('#r');
    const count = impl.highlightInDom(root, ['react']);
    expect(count).toBe(3);
    expect([...root.querySelectorAll('mark')].map((el) => el.textContent)).toEqual(['React', 'react', 'react']);
    expect(root.textContent).toBe('Use React hooks. react is great, reactive!');
    expect(root.querySelector('#r')).toBe(bold);
    expect(root.querySelector('a')).toHaveAttribute('href', '/x');
  });

  it('merges overlaps within a text node and skips script/style', () => {
    const root = document.createElement('div');
    root.innerHTML = '<p>abcdef</p><style>.abc{}</style><script>var abc = 1;</script>';
    expect(impl.highlightInDom(root, ['abc', 'cde'])).toBe(1);
    expect(root.querySelector('p mark')?.textContent).toBe('abcde');
    expect(root.querySelector('style mark, script mark')).toBeNull();
  });
});
