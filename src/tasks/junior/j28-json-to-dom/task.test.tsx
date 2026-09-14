// ⚠ Unverified: written before the reference solution. If a test looks wrong, trust the README.
import { beforeEach, expect, it, vi } from 'vitest';
import { pickTarget } from '../../../test/target';
import * as Reference from './Reference';
import * as Solution from './Solution';
import type { VNode } from './types';

const { impl, describeTask, describeFollowUp } = pickTarget(Solution, Reference);

let container: HTMLDivElement;
beforeEach(() => {
  container = document.createElement('div');
  document.body.replaceChildren(container);
});

describeTask('render', () => {
  it('builds nested elements and text nodes in order', () => {
    impl.render(
      {
        type: 'div',
        children: ['Hello ', { type: 'strong', children: ['world'] }, { type: 'ul', children: [{ type: 'li', children: ['one'] }, { type: 'li' }] }],
      },
      container,
    );
    expect(container.innerHTML).toBe('<div>Hello <strong>world</strong><ul><li>one</li><li></li></ul></div>');
  });

  it('maps className and htmlFor, and stringifies other attributes', () => {
    impl.render(
      { type: 'label', props: { className: 'field big', htmlFor: 'email', id: 'lbl', 'data-id': 7, 'aria-label': 'Email' } },
      container,
    );
    const label = container.firstElementChild!;
    expect(label.tagName).toBe('LABEL');
    expect(label.getAttribute('class')).toBe('field big');
    expect(label.getAttribute('for')).toBe('email');
    expect(label.getAttribute('id')).toBe('lbl');
    expect(label.getAttribute('data-id')).toBe('7');
    expect(label.getAttribute('aria-label')).toBe('Email');
    expect(label.hasAttribute('className')).toBe(false);
    expect(label.hasAttribute('htmlFor')).toBe(false);
  });

  it('treats true as an empty attribute and skips false, null and undefined', () => {
    impl.render({ type: 'input', props: { disabled: true, required: false, placeholder: null, title: undefined } }, container);
    const input = container.querySelector('input')!;
    expect(input.getAttribute('disabled')).toBe('');
    expect(input.hasAttribute('required')).toBe(false);
    expect(input.hasAttribute('placeholder')).toBe(false);
    expect(input.hasAttribute('title')).toBe(false);
  });

  it('applies a style object', () => {
    impl.render({ type: 'p', props: { style: { color: 'red', backgroundColor: 'blue', marginTop: '4px' } } }, container);
    const p = container.querySelector('p')!;
    expect(p.style.color).toBe('red');
    expect(p.style.backgroundColor).toBe('blue');
    expect(p.style.marginTop).toBe('4px');
  });

  it('attaches on* function props as event listeners, not attributes', () => {
    const onClick = vi.fn();
    const onMouseEnter = vi.fn();
    impl.render({ type: 'button', props: { onClick, onMouseEnter }, children: ['Go'] }, container);
    const button = container.querySelector('button')!;
    button.click();
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onClick.mock.calls[0][0]).toBeInstanceOf(Event);
    button.dispatchEvent(new MouseEvent('mouseenter'));
    expect(onMouseEnter).toHaveBeenCalledTimes(1);
    expect(button.hasAttribute('onClick')).toBe(false);
    expect(button.hasAttribute('onclick')).toBe(false);
  });

  it('gives each element its own listeners', () => {
    const clicks: string[] = [];
    impl.render(
      {
        type: 'div',
        children: ['a', 'b', 'c'].map((name) => ({ type: 'button', props: { onClick: () => clicks.push(name) }, children: [name] })),
      },
      container,
    );
    const buttons = container.querySelectorAll('button');
    buttons[2].click();
    buttons[0].click();
    expect(clicks).toEqual(['c', 'a']);
  });

  it('inserts strings as text, never as HTML', () => {
    const evil = '<img src=x onerror="alert(1)"><b>bold</b>';
    impl.render({ type: 'div', children: [evil] }, container);
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('b')).toBeNull();
    expect(container.textContent).toBe(evil);
  });

  it('renders numbers (including 0) and skips null, undefined and booleans', () => {
    impl.render({ type: 'span', children: [0, null, 'x', undefined, false, true, 42] }, container);
    expect(container.innerHTML).toBe('<span>0x42</span>');
  });

  it('replaces the container content and returns the created node', () => {
    container.innerHTML = '<p>old</p>';
    const node = impl.render({ type: 'section', props: null, children: [] }, container);
    expect(container.childNodes).toHaveLength(1);
    expect(node).toBe(container.firstChild);
    expect((node as Element).tagName).toBe('SECTION');
  });

  it('handles a text root and a null root', () => {
    const text = impl.render('just text', container);
    expect(text?.nodeType).toBe(Node.TEXT_NODE);
    expect(container.textContent).toBe('just text');

    expect(impl.render(null, container)).toBeNull();
    expect(container.childNodes).toHaveLength(0);
  });
});

describeFollowUp(1, 'serialize', () => {
  it('round-trips attributes, style, text and nesting', () => {
    const vnode: VNode = {
      type: 'form',
      props: { className: 'card', id: 'f' },
      children: [
        { type: 'label', props: { htmlFor: 'q' }, children: ['Query'] },
        { type: 'input', props: { id: 'q', required: true, style: { color: 'red' } }, children: [] },
      ],
    };
    const node = impl.render(vnode, container)!;
    expect(impl.serialize(node)).toEqual(vnode);
  });

  it('turns text nodes into strings and skips comments', () => {
    const div = document.createElement('div');
    div.append('hi', document.createComment('ignore me'));
    expect(impl.serialize(div)).toEqual({ type: 'div', props: {}, children: ['hi'] });
  });
});

describeFollowUp(2, 'patch on re-render', () => {
  it('reuses nodes of the same type and updates attributes, text and listeners', () => {
    const first = vi.fn();
    const second = vi.fn();
    const a = impl.render({ type: 'button', props: { className: 'a', title: 'old', onClick: first }, children: ['One'] }, container);
    const b = impl.render({ type: 'button', props: { className: 'b', onClick: second }, children: ['Two'] }, container);
    expect(b).toBe(a);
    const button = container.querySelector('button')!;
    expect(button.className).toBe('b');
    expect(button.hasAttribute('title')).toBe(false);
    expect(button.textContent).toBe('Two');
    button.click();
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('adds and removes children, and replaces nodes whose type changed', () => {
    impl.render({ type: 'ul', children: [{ type: 'li', children: ['1'] }, { type: 'li', children: ['2'] }] }, container);
    const firstLi = container.querySelector('li');
    impl.render({ type: 'ul', children: [{ type: 'li', children: ['1!'] }] }, container);
    expect(container.innerHTML).toBe('<ul><li>1!</li></ul>');
    expect(container.querySelector('li')).toBe(firstLi);
    impl.render({ type: 'ol', children: [{ type: 'li', children: ['x'] }, { type: 'li', children: ['y'] }] }, container);
    expect(container.innerHTML).toBe('<ol><li>x</li><li>y</li></ol>');
  });
});

describeFollowUp(3, 'SVG namespace', () => {
  it('creates svg and its descendants in the SVG namespace', () => {
    impl.render(
      { type: 'div', children: [{ type: 'svg', props: { viewBox: '0 0 10 10' }, children: [{ type: 'circle', props: { r: 4 } }] }] },
      container,
    );
    const SVG_NS = 'http://www.w3.org/2000/svg';
    expect(container.querySelector('div')!.namespaceURI).toBe('http://www.w3.org/1999/xhtml');
    expect(container.querySelector('svg')!.namespaceURI).toBe(SVG_NS);
    expect(container.querySelector('circle')!.namespaceURI).toBe(SVG_NS);
    expect(container.querySelector('circle')!.getAttribute('r')).toBe('4');
  });
});
