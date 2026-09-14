// ⚠ Unverified: written before the reference solution. If a test looks wrong, trust the README.
import { afterEach, expect, it, vi } from 'vitest';
import { pickTarget } from '../../../test/target';
import * as Reference from './Reference';
import * as Solution from './Solution';

const { impl, describeTask, describeFollowUp } = pickTarget(Solution, Reference);

let container: HTMLElement | null = null;

function mount(html: string): HTMLElement {
  container = document.createElement('div');
  container.innerHTML = html;
  document.body.appendChild(container);
  return container;
}

const byId = (id: string) => document.getElementById(id)!;

afterEach(() => {
  container?.remove();
  container = null;
  vi.restoreAllMocks();
});

/** Fails the test if a forbidden query API is used while `run` executes. */
function withoutQueryApis<T>(run: () => T): T {
  const spies = [
    vi.spyOn(Element.prototype, 'querySelector'),
    vi.spyOn(Element.prototype, 'querySelectorAll'),
    vi.spyOn(Element.prototype, 'getElementsByClassName'),
    vi.spyOn(Element.prototype, 'getElementsByTagName'),
    vi.spyOn(Element.prototype, 'matches'),
    vi.spyOn(Element.prototype, 'closest'),
    vi.spyOn(Document.prototype, 'querySelector'),
    vi.spyOn(Document.prototype, 'querySelectorAll'),
  ];
  const result = run();
  for (const spy of spies) expect(spy).not.toHaveBeenCalled();
  return result;
}

describeTask('getElementsByClassName', () => {
  it('returns descendants having all classes, in document order, excluding root', () => {
    const root = mount(`
      <section id="root" class="card">
        <div id="a" class="card active">
          <span id="b" class="active card extra"></span>
        </div>
        <p id="c" class="card"></p>
        <p id="d" class="active"></p>
        <div><i id="e" class="card active"></i></div>
      </section>`);
    const section = byId('root');
    const result = withoutQueryApis(() => impl.getElementsByClassName(section, 'card active'));
    expect(result).toEqual([byId('a'), byId('b'), byId('e')]);
    expect(result).not.toContain(root);
  });

  it('matches whole tokens only and is case-sensitive', () => {
    mount(`
      <div id="root">
        <button id="a" class="btn"></button>
        <button id="b" class="btn-primary"></button>
        <button id="c" class="BTN"></button>
        <button id="d" class="xbtn btn"></button>
      </div>`);
    expect(withoutQueryApis(() => impl.getElementsByClassName(byId('root'), 'btn'))).toEqual([byId('a'), byId('d')]);
  });

  it('tolerates messy whitespace and duplicate tokens', () => {
    mount(`
      <div id="root">
        <div id="a" class="  x   y x "></div>
        <div id="b" class="y"></div>
      </div>`);
    const result = withoutQueryApis(() => impl.getElementsByClassName(byId('root'), '\n y \t x  y '));
    expect(result).toEqual([byId('a')]);
  });

  it('returns [] for empty or whitespace-only classNames', () => {
    mount(`<div id="root"><div class="a"></div></div>`);
    expect(impl.getElementsByClassName(byId('root'), '')).toEqual([]);
    expect(impl.getElementsByClassName(byId('root'), '   ')).toEqual([]);
  });
});

describeTask('getElementsByStyle', () => {
  it('matches computed styles from inline styles and style sheets', () => {
    mount(`
      <style>.grid { display: grid; }</style>
      <div id="root">
        <div id="a" style="display: grid"></div>
        <div id="b" class="grid"></div>
        <div id="c" style="display: flex"></div>
        <span id="d"></span>
      </div>`);
    const result = impl.getElementsByStyle(byId('root'), 'display', 'grid');
    expect(result).toEqual([byId('a'), byId('b')]);
  });

  it('normalizes the expected value (red → rgb) and includes inherited values', () => {
    mount(`
      <div id="root">
        <p id="a" style="color: red"><span id="b">inherits red</span></p>
        <p id="c" style="color: rgb(255, 0, 0)"></p>
        <p id="d" style="color: blue"></p>
      </div>`);
    const result = impl.getElementsByStyle(byId('root'), 'color', 'red');
    expect(result).toEqual([byId('a'), byId('b'), byId('c')]);
  });

  it('excludes root, handles kebab-case properties and leaves the DOM untouched', () => {
    const root = mount(`
      <div id="root" style="margin-top: 4px">
        <div id="a" style="margin-top: 4px"></div>
        <div id="b" style="margin-top: 8px"></div>
      </div>`);
    const before = root.innerHTML;
    const bodyChildren = document.body.childNodes.length;
    expect(impl.getElementsByStyle(byId('root'), 'margin-top', '4px')).toEqual([byId('a')]);
    expect(root.innerHTML).toBe(before);
    expect(document.body.childNodes.length).toBe(bodyChildren);
  });
});

describeTask('findCorrespondingNode', () => {
  const tree = `
    <div>
      text
      <ul>
        <li>one</li>
        <!-- comment -->
        <li><b>two</b> and <i>three</i></li>
      </ul>
      <p>tail</p>
    </div>`;

  function twoTrees() {
    mount(`<div id="A">${tree}</div><div id="B">${tree}</div>`);
    return { rootA: byId('A'), rootB: byId('B') };
  }

  it('returns rootB for rootA', () => {
    const { rootA, rootB } = twoTrees();
    expect(impl.findCorrespondingNode(rootA, rootB, rootA)).toBe(rootB);
  });

  it('finds deeply nested elements at the same position', () => {
    const { rootA, rootB } = twoTrees();
    const nodeA = rootA.getElementsByTagName('i')[0];
    const expected = rootB.getElementsByTagName('i')[0];
    const found = withoutQueryApis(() => impl.findCorrespondingNode(rootA, rootB, nodeA));
    expect(found).toBe(expected);
  });

  it('counts text and comment nodes when computing positions', () => {
    const { rootA, rootB } = twoTrees();
    const liA = rootA.getElementsByTagName('li')[1];
    const liB = rootB.getElementsByTagName('li')[1];
    const textA = liA.childNodes[1]; // " and "
    expect(textA.nodeType).toBe(Node.TEXT_NODE);
    expect(impl.findCorrespondingNode(rootA, rootB, textA)).toBe(liB.childNodes[1]);
    expect(impl.findCorrespondingNode(rootA, rootB, liA)).toBe(liB);
  });

  it('returns null when nodeA is not inside rootA', () => {
    const { rootA, rootB } = twoTrees();
    const outsider = rootB.getElementsByTagName('p')[0];
    expect(impl.findCorrespondingNode(rootA, rootB, outsider)).toBeNull();
    expect(impl.findCorrespondingNode(rootA, rootB, document.createElement('p'))).toBeNull();
  });
});

describeFollowUp(1, 'getCssSelector', () => {
  it('produces a selector that uniquely matches each element', () => {
    const root = mount(`
      <main>
        <ul><li>a</li><li class="x">b</li><li class="x">c</li></ul>
        <ul><li>d</li><li><span id="unique">e</span></li></ul>
        <div><div><div>deep</div></div></div>
      </main>`);
    const elements = Array.from(root.getElementsByTagName('*'));
    for (const el of elements) {
      const selector = impl.getCssSelector(el, root);
      expect(root.querySelector(selector)).toBe(el);
    }
  });
});
