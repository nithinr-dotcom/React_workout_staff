// ⚠ Unverified: written before the reference solution. If a test looks wrong, trust the README.
import { afterEach, expect, it, vi } from 'vitest';
import { pickTarget } from '../../../test/target';
import * as Reference from './Reference';
import * as Solution from './Solution';
import type { DomTreeUtilsModule, TreeNode } from './types';

const { impl: rawImpl, describeTask, describeFollowUp } = pickTarget(Solution, Reference);
const impl = rawImpl as unknown as DomTreeUtilsModule;

afterEach(() => {
  vi.restoreAllMocks();
});

function fromHtml(html: string): HTMLDivElement {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div;
}

const TREE_A = `
  <header>
    <h1>Title</h1>
    <!-- nav goes here -->
    <nav><a>one</a><a>two</a></nav>
  </header>
  <main>
    <section id="off-path">
      <div><p><span>deep</span></p><p>x</p></div>
      <ul><li>a</li><li>b</li></ul>
    </section>
    <section>
      <article>
        <p>first</p>
        <p class="target">second <b>bold</b> <i>italic</i></p>
      </article>
    </section>
  </main>
`;
const TREE_B =
  '<header><h1>Другой</h1><nav><a>1</a><a>2</a></nav></header>' +
  '<main><section id="off-path-b"><div><p><span>zz</span></p><p>y</p></div><ul><li>c</li><li>d</li></ul></section>' +
  '<section><article><p>uno</p><!-- c --><p>dos <b>B</b><i>I</i></p></article></section></main>';

/** Counts reads of child-access getters on every element of `subtree`. */
function watchSubtree(subtree: Element) {
  const reads: string[] = [];
  const props = ['children', 'childNodes', 'firstChild', 'firstElementChild', 'lastChild', 'lastElementChild', 'childElementCount'];
  const elements = [subtree, ...Array.from(subtree.getElementsByTagName('*'))];
  for (const el of elements) {
    for (const prop of props) {
      let proto: object | null = Object.getPrototypeOf(el);
      let descriptor: PropertyDescriptor | undefined;
      while (proto && !descriptor) {
        descriptor = Object.getOwnPropertyDescriptor(proto, prop);
        proto = Object.getPrototypeOf(proto);
      }
      const getter = descriptor?.get;
      if (!getter) continue;
      Object.defineProperty(el, prop, {
        configurable: true,
        get() {
          reads.push(`${el.tagName.toLowerCase()}.${prop}`);
          return getter.call(el);
        },
      });
    }
  }
  return reads;
}

function forbidQueryApis() {
  return [
    vi.spyOn(Element.prototype, 'querySelector'),
    vi.spyOn(Element.prototype, 'querySelectorAll'),
    vi.spyOn(Element.prototype, 'getElementsByTagName'),
    vi.spyOn(Element.prototype, 'getElementsByClassName'),
    vi.spyOn(Node.prototype, 'contains'),
    vi.spyOn(Document.prototype, 'createTreeWalker'),
  ];
}

/** Built bottom-up: appending under a deep node makes jsdom itself recurse through every ancestor. */
function chain(depth: number): HTMLDivElement {
  let root = document.createElement('div');
  for (let i = 1; i < depth; i++) {
    const parent = document.createElement('div');
    parent.appendChild(root);
    root = parent;
  }
  return root;
}

describeTask('findCorrespondingNode', () => {
  it('returns rootB for rootA', () => {
    const a = fromHtml(TREE_A);
    const b = fromHtml(TREE_B);
    expect(impl.findCorrespondingNode(a, b, a)).toBe(b);
  });

  it('finds the element at the same element-index path, ignoring text, whitespace and comments', () => {
    const a = fromHtml(TREE_A);
    const b = fromHtml(TREE_B);
    const spies = forbidQueryApis();
    const targetA = a.children[1].children[1].children[0].children[1]; // main > section[1] > article > p[1]
    const targetB = b.children[1].children[1].children[0].children[1];
    expect(impl.findCorrespondingNode(a, b, targetA)).toBe(targetB);
    expect(impl.findCorrespondingNode(a, b, targetA.children[1])).toBe(targetB.children[1]);
    const secondLink = a.children[0].children[1].children[1];
    expect(impl.findCorrespondingNode(a, b, secondLink)).toBe(b.children[0].children[1].children[1]);
    for (const spy of spies) expect(spy).not.toHaveBeenCalled();
  });

  it('does not visit subtrees that are off the path', () => {
    const a = fromHtml(TREE_A);
    const b = fromHtml(TREE_B);
    const targetA = a.children[1].children[1].children[0].children[1].children[0]; // the <b>
    const expected = b.children[1].children[1].children[0].children[1].children[0];
    const readsA = watchSubtree(a.children[1].children[0]);
    const readsB = watchSubtree(b.children[1].children[0]);
    const readsHeaderB = watchSubtree(b.children[0]);
    expect(impl.findCorrespondingNode(a, b, targetA)).toBe(expected);
    expect(readsA).toEqual([]);
    expect(readsB).toEqual([]);
    expect(readsHeaderB).toEqual([]);
  });

  it('returns null for a target outside rootA', () => {
    const a = fromHtml(TREE_A);
    const b = fromHtml(TREE_B);
    const stranger = fromHtml('<p>elsewhere</p>').firstElementChild!;
    expect(impl.findCorrespondingNode(a, b, stranger)).toBeNull();
    expect(impl.findCorrespondingNode(a, b, b.children[0])).toBeNull();
  });

  it('returns null when the path does not exist in rootB', () => {
    const a = fromHtml('<ul><li>1</li><li>2</li><li>3</li></ul>');
    const b = fromHtml('<ul><li>1</li></ul>');
    expect(impl.findCorrespondingNode(a, b, a.children[0].children[2])).toBeNull();
  });
});

describeTask('getTableOfContents', () => {
  it('nests headings under the closest preceding heading with a smaller level', () => {
    const root = fromHtml(`
      <h1 id="guide">Guide</h1>
      <p>intro</p>
      <h2 id="install">Install</h2>
      <h3 id="npm">npm</h3>
      <h3 id="yarn">yarn</h3>
      <h2 id="usage">Usage</h2>
      <h1 id="appendix">Appendix</h1>
    `);
    expect(impl.getTableOfContents(root)).toEqual([
      {
        text: 'Guide',
        level: 1,
        id: 'guide',
        children: [
          {
            text: 'Install',
            level: 2,
            id: 'install',
            children: [
              { text: 'npm', level: 3, id: 'npm', children: [] },
              { text: 'yarn', level: 3, id: 'yarn', children: [] },
            ],
          },
          { text: 'Usage', level: 2, id: 'usage', children: [] },
        ],
      },
      { text: 'Appendix', level: 1, id: 'appendix', children: [] },
    ]);
  });

  it('handles skipped levels and a document that starts deeper', () => {
    const root = fromHtml(`
      <h3 id="a">A</h3>
      <h2 id="b">B</h2>
      <h4 id="c">C</h4>
      <h1 id="d">D</h1>
      <h3 id="e">E</h3>
    `);
    expect(impl.getTableOfContents(root)).toEqual([
      { text: 'A', level: 3, id: 'a', children: [] },
      { text: 'B', level: 2, id: 'b', children: [{ text: 'C', level: 4, id: 'c', children: [] }] },
      { text: 'D', level: 1, id: 'd', children: [{ text: 'E', level: 3, id: 'e', children: [] }] },
    ]);
  });

  it('finds headings at any depth, collapses whitespace in text, and ignores root itself', () => {
    const root = document.createElement('h1');
    root.id = 'root-heading';
    root.innerHTML = `
      <section><div><h2 id="x">  Hello
        <em>big</em>   world </h2></div></section>
      <article><h3 id="y">Nested</h3></article>
    `;
    expect(impl.getTableOfContents(root)).toEqual([
      { text: 'Hello big world', level: 2, id: 'x', children: [{ text: 'Nested', level: 3, id: 'y', children: [] }] },
    ]);
  });

  it('generates slugs for headings without an id', () => {
    const root = fromHtml(`
      <h2>Hello, World!</h2>
      <h2>What's new in v2.0?</h2>
      <h2>  API  —  reference  </h2>
      <h2>--Leading - and trailing--</h2>
      <h2>🎉!!</h2>
    `);
    expect(impl.getTableOfContents(root).map((e) => e.id)).toEqual([
      'hello-world',
      'whats-new-in-v20',
      'api-reference',
      'leading-and-trailing',
      'section',
    ]);
  });

  it('de-duplicates generated ids, avoiding every id already present in root', () => {
    const root = fromHtml(`
      <h2>Intro</h2>
      <h2>Intro</h2>
      <h3>Setup</h3>
      <h2 id="intro-1">Explicit</h2>
      <p id="setup">a paragraph that owns the id "setup"</p>
      <h2>Intro</h2>
      <h2>?</h2>
      <h2>!</h2>
    `);
    expect(impl.getTableOfContents(root).flatMap((e) => [e.id, ...e.children.map((c) => c.id)])).toEqual([
      'intro',
      'intro-2',
      'setup-1',
      'intro-1',
      'intro-3',
      'section',
      'section-1',
    ]);
  });

  it('returns [] without headings and does not modify the DOM', () => {
    expect(impl.getTableOfContents(fromHtml('<p>no headings</p>'))).toEqual([]);
    const root = fromHtml('<h1>One</h1><h2>Two</h2>');
    const before = root.innerHTML;
    impl.getTableOfContents(root);
    expect(root.innerHTML).toBe(before);
  });
});

describeTask('getTreeHeight & levelOrder', () => {
  it('measures height in element levels, ignoring text and comments', () => {
    expect(impl.getTreeHeight(document.createElement('div'))).toBe(1);
    const root = fromHtml('text<p>a <!-- c --> <b>bold <i>x</i></b></p><ul><li>1</li></ul>');
    // div > p > b > i
    expect(impl.getTreeHeight(root)).toBe(4);
  });

  it('lists tag names level by level, left to right across parents', () => {
    const root = fromHtml(`
      <header><h1>t</h1></header>
      text
      <main><section><p>1</p><p>2</p></section><aside><span>s</span></aside></main>
      <footer></footer>
    `);
    expect(impl.levelOrder(root)).toEqual([['div'], ['header', 'main', 'footer'], ['h1', 'section', 'aside'], ['p', 'p', 'span']]);
    expect(impl.levelOrder(document.createElement('span'))).toEqual([['span']]);
  });

  it('handles a 50,000-level chain without recursion', () => {
    const root = chain(50_000);
    expect(impl.getTreeHeight(root)).toBe(50_000);
    const levels = impl.levelOrder(root);
    expect(levels).toHaveLength(50_000);
    expect(levels[49_999]).toEqual(['div']);
  });
});

describeFollowUp(1, 'findInClone on plain object trees', () => {
  const node = (value: unknown, ...children: TreeNode[]): TreeNode => ({ value, children });
  const build = () => node('root', node('a', node('a1'), node('a2', node('x'))), node('b'), node('c', node('c1'), node('c2')));

  it('finds the node at the same position without parent pointers', () => {
    const a = build();
    const b = build();
    expect(impl.findInClone(a, b, a)).toBe(b);
    expect(impl.findInClone(a, b, a.children[0].children[1].children[0])).toBe(b.children[0].children[1].children[0]);
    expect(impl.findInClone(a, b, a.children[2].children[1])).toBe(b.children[2].children[1]);
  });

  it('matches by position, not by value, and returns null for strangers', () => {
    const a = node('r', node('same'), node('same'));
    const b = node('r', node('same'), node('same'));
    expect(impl.findInClone(a, b, a.children[1])).toBe(b.children[1]);
    expect(impl.findInClone(a, b, node('same'))).toBeNull();
  });
});

describeFollowUp(2, 'nextRightSibling', () => {
  it('returns the next element on the same level, crossing parents', () => {
    const root = fromHtml(`
      <section><p id="p1"></p><p id="p2"></p></section>
      <aside></aside>
      <article><span id="s1"></span></article>
    `);
    const byId = (id: string) => root.querySelector(`#${id}`)!;
    expect(impl.nextRightSibling(root, byId('p1'))).toBe(byId('p2'));
    expect(impl.nextRightSibling(root, byId('p2'))).toBe(byId('s1'));
    expect(impl.nextRightSibling(root, byId('s1'))).toBeNull();
    expect(impl.nextRightSibling(root, root.children[1])).toBe(root.children[2]);
    expect(impl.nextRightSibling(root, root)).toBeNull();
  });
});
