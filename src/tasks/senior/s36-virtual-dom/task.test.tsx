// ⚠ Unverified: written before the reference solution. If a test looks wrong, trust the README.
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { pickTarget } from '../../../test/target';
import * as Reference from './Reference';
import * as Solution from './Solution';
import type { VNode } from './types';

const { impl, describeTask, describeFollowUp } = pickTarget(Solution, Reference);

let container: HTMLElement;
let observer: MutationObserver | null = null;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
});

afterEach(() => {
  observer?.disconnect();
  observer = null;
  container.remove();
});

function observe() {
  observer = new MutationObserver(() => {});
  observer.observe(container, { childList: true, attributes: true, characterData: true, subtree: true });
  return () => observer!.takeRecords();
}

const tag = (name: string, i = 0) => container.getElementsByTagName(name)[i];

describeTask('Virtual DOM: h', () => {
  it('builds a vnode with normalized children and extracts key', () => {
    const { h } = impl;
    const vnode = h('ul', { id: 'list', key: 7 }, 'a', 0, null, false, true, undefined, ['b', [h('li', null)]]);
    expect(vnode).toEqual({
      type: 'ul',
      props: { id: 'list' },
      key: 7,
      children: ['a', '0', 'b', { type: 'li', props: {}, children: [], key: null }],
    });
  });
});

describeTask('Virtual DOM: render', () => {
  it('mounts elements, attributes and text, replacing existing content', () => {
    const { h, render } = impl;
    container.innerHTML = '<p>old content</p>';
    const node = render(
      h('section', { class: 'card', 'aria-label': 'Profile', 'data-id': 42 }, h('h2', null, 'Ada'), 'Hello ', 'world'),
      container,
    );
    expect(container.childNodes).toHaveLength(1);
    expect(node).toBe(container.firstChild);
    const section = container.firstChild as HTMLElement;
    expect(section.tagName).toBe('SECTION');
    expect(section.getAttribute('class')).toBe('card');
    expect(section.getAttribute('aria-label')).toBe('Profile');
    expect(section.getAttribute('data-id')).toBe('42');
    expect(section.childNodes).toHaveLength(3);
    expect(section.childNodes[1].nodeType).toBe(Node.TEXT_NODE);
    expect(section.textContent).toBe('AdaHello world');
  });

  it('handles boolean attributes, value/checked properties and event listeners', () => {
    const { h, render } = impl;
    const onClick = vi.fn();
    render(
      h(
        'form',
        null,
        h('input', { type: 'checkbox', checked: true, disabled: true, hidden: false, title: null }),
        h('input', { value: 'typed' }),
        h('button', { type: 'button', onClick }, 'Go'),
      ),
      container,
    );
    const checkbox = tag('input', 0) as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
    expect(checkbox.getAttribute('disabled')).toBe('');
    expect(checkbox.hasAttribute('hidden')).toBe(false);
    expect(checkbox.hasAttribute('title')).toBe(false);
    expect((tag('input', 1) as HTMLInputElement).value).toBe('typed');
    (tag('button') as HTMLButtonElement).click();
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(tag('button').hasAttribute('onClick')).toBe(false);
    expect(tag('button').hasAttribute('onclick')).toBe(false);
  });
});

describeTask('Virtual DOM: patch', () => {
  it('updates text in place, keeping element and text node identity', () => {
    const { h, render, patch } = impl;
    const view = (n: number) => h('div', null, h('span', null, 'Count: ', n));
    render(view(0), container);
    const div = container.firstChild;
    const span = tag('span');
    const countText = span.childNodes[1];

    const returned = patch(container, view(0), view(1));
    expect(returned).toBe(div);
    expect(container.firstChild).toBe(div);
    expect(tag('span')).toBe(span);
    expect(span.childNodes[1]).toBe(countText);
    expect(span.textContent).toBe('Count: 1');
  });

  it('adds, changes and removes attributes on the same element', () => {
    const { h, render, patch } = impl;
    const oldV = h('a', { href: '/one', class: 'link', title: 'Old', hidden: true });
    const newV = h('a', { href: '/two', class: 'link', 'aria-current': 'page', hidden: false });
    render(oldV, container);
    const anchor = container.firstChild as HTMLElement;
    patch(container, oldV, newV);
    expect(container.firstChild).toBe(anchor);
    expect(anchor.getAttribute('href')).toBe('/two');
    expect(anchor.getAttribute('class')).toBe('link');
    expect(anchor.getAttribute('aria-current')).toBe('page');
    expect(anchor.hasAttribute('title')).toBe(false);
    expect(anchor.hasAttribute('hidden')).toBe(false);
  });

  it('only touches what changed (attribute and text mutation records)', () => {
    const { h, render, patch } = impl;
    const oldV = h('div', { class: 'a', id: 'root' }, h('p', null, 'keep'), h('p', null, 'old'));
    const newV = h('div', { class: 'b', id: 'root' }, h('p', null, 'keep'), h('p', null, 'new'));
    render(oldV, container);
    const takeRecords = observe();
    patch(container, oldV, newV);
    const records = takeRecords();
    expect(records.map((r) => r.type).sort()).toEqual(['attributes', 'characterData']);
    expect(records.find((r) => r.type === 'attributes')!.attributeName).toBe('class');
  });

  it('performs zero DOM mutations when patching an identical tree', () => {
    const { h, render, patch } = impl;
    const view = () =>
      h('ul', { class: 'list' }, h('li', { 'data-x': 1 }, 'one'), h('li', null, 'two', h('b', null, '!')));
    render(view(), container);
    const takeRecords = observe();
    patch(container, view(), view());
    expect(takeRecords()).toHaveLength(0);
  });

  it('replaces the node when the type or kind changes', () => {
    const { h, render, patch } = impl;
    const oldV = h('div', null, h('span', null, 'x'), 'text');
    const newV = h('div', null, h('strong', null, 'x'), h('em', null, 'now an element'));
    render(oldV, container);
    const div = container.firstChild;
    const span = tag('span');
    patch(container, oldV, newV);
    expect(container.firstChild).toBe(div);
    expect(tag('span')).toBeUndefined();
    expect(tag('strong')).not.toBe(span);
    expect((div as HTMLElement).innerHTML).toBe('<strong>x</strong><em>now an element</em>');

    const rootText = patch(container, newV, 'just text');
    expect(container.childNodes).toHaveLength(1);
    expect(container.firstChild).toBe(rootText);
    expect(container.textContent).toBe('just text');
    expect(container.firstChild!.nodeType).toBe(Node.TEXT_NODE);
  });

  it('appends and removes children by index while keeping existing nodes', () => {
    const { h, render, patch } = impl;
    const list = (items: string[]) => h('ul', null, ...items.map((t) => h('li', null, t)));
    render(list(['a', 'b']), container);
    const [a, b] = Array.from(container.getElementsByTagName('li'));

    patch(container, list(['a', 'b']), list(['a', 'b', 'c', 'd']));
    let lis = Array.from(container.getElementsByTagName('li'));
    expect(lis.map((li) => li.textContent)).toEqual(['a', 'b', 'c', 'd']);
    expect(lis[0]).toBe(a);
    expect(lis[1]).toBe(b);

    patch(container, list(['a', 'b', 'c', 'd']), list(['a']));
    lis = Array.from(container.getElementsByTagName('li'));
    expect(lis).toEqual([a]);

    patch(container, list(['a']), list([]));
    expect(container.firstChild!.childNodes).toHaveLength(0);
  });

  it('swaps and removes event listeners without duplicating them', () => {
    const { h, render, patch } = impl;
    const first = vi.fn();
    const second = vi.fn();
    const v1 = h('button', { onClick: first }, 'go');
    const v2 = h('button', { onClick: second }, 'go');
    const v3 = h('button', { onClick: second }, 'go');
    const v4 = h('button', null, 'go');
    render(v1, container);
    const button = container.firstChild as HTMLButtonElement;

    patch(container, v1, v2);
    button.click();
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);

    patch(container, v2, v3);
    button.click();
    expect(second).toHaveBeenCalledTimes(2);

    patch(container, v3, v4);
    button.click();
    expect(second).toHaveBeenCalledTimes(2);
    expect(container.firstChild).toBe(button);
  });

  it('supports chained patches using the previous new vnode as the old one', () => {
    const { h, render, patch } = impl;
    const onInput = vi.fn();
    const view = (label: string, done: boolean): VNode =>
      h('label', { class: done ? 'done' : null }, h('input', { type: 'checkbox', checked: done, onInput }), label);
    let current = view('Write tests', false);
    render(current, container);
    const input = tag('input') as HTMLInputElement;

    for (const [label, done] of [
      ['Write tests', true],
      ['Write more tests', true],
      ['Write more tests', false],
    ] as const) {
      const next = view(label, done);
      patch(container, current, next);
      current = next;
    }
    expect(tag('input')).toBe(input);
    expect(input.checked).toBe(false);
    expect(container.firstChild).toHaveTextContent('Write more tests');
    expect((container.firstChild as HTMLElement).hasAttribute('class')).toBe(false);
    input.dispatchEvent(new Event('input'));
    expect(onInput).toHaveBeenCalledTimes(1);
  });
});

describeFollowUp(1, 'keyed children', () => {
  const list = (ids: string[]) => impl.h('ul', null, ...ids.map((id) => impl.h('li', { key: id }, id)));

  it('moves keyed nodes on reorder instead of re-texting them', () => {
    render3();
    const before = new Map(Array.from(container.getElementsByTagName('li')).map((li) => [li.textContent, li]));
    impl.patch(container, list(['a', 'b', 'c']), list(['c', 'a', 'b']));
    const after = Array.from(container.getElementsByTagName('li'));
    expect(after.map((li) => li.textContent)).toEqual(['c', 'a', 'b']);
    expect(after[0]).toBe(before.get('c'));
    expect(after[1]).toBe(before.get('a'));
    expect(after[2]).toBe(before.get('b'));
  });

  it('keeps identity when inserting at the start and removing from the middle', () => {
    render3();
    const [a, , c] = Array.from(container.getElementsByTagName('li'));
    impl.patch(container, list(['a', 'b', 'c']), list(['z', 'a', 'c']));
    const after = Array.from(container.getElementsByTagName('li'));
    expect(after.map((li) => li.textContent)).toEqual(['z', 'a', 'c']);
    expect(after[1]).toBe(a);
    expect(after[2]).toBe(c);
  });

  function render3() {
    impl.render(list(['a', 'b', 'c']), container);
  }
});
