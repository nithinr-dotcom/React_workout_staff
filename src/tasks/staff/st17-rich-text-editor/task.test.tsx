// ⚠ Unverified: written before the reference solution. If a test looks wrong, trust the README.
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { pickTarget } from '../../../test/target';
import * as Reference from './Reference';
import * as Solution from './Solution';
import type { Block, Doc, EditorState, Marks, RichTextModule, Selection, TextRun } from './types';

const { impl, describeTask } = pickTarget<RichTextModule>(Solution, Reference);

// ---------- builders ----------
const t = (text: string, marks: Marks = {}): TextRun => ({ text, marks });
const p = (...runs: TextRun[]): Block => ({ type: 'paragraph', runs });
const doc = (...blocks: Block[]): Doc => ({ blocks });
const at = (block: number, offset: number): Selection => ({ anchor: { block, offset }, focus: { block, offset } });
const sel = (b1: number, o1: number, b2: number, o2: number): Selection => ({
  anchor: { block: b1, offset: o1 },
  focus: { block: b2, offset: o2 },
});
const state = (d: Doc, s: Selection): EditorState => impl.createState(d, s);
const B = { bold: true } as const;
const I = { italic: true } as const;
const texts = (d: Doc) => d.blocks.map((b) => b.runs.map((r) => r.text).join(''));

describeTask('Document model', () => {
  it('insertText inherits marks from the text before the cursor and replaces selections', () => {
    const base = doc(p(t('Hello '), t('world', B)));

    const a = impl.insertText(state(base, at(0, 6)), 'big ');
    expect(a.doc).toEqual(doc(p(t('Hello big '), t('world', B))));
    expect(a.selection).toEqual(at(0, 10));

    expect(impl.insertText(state(base, at(0, 8)), 'X').doc).toEqual(doc(p(t('Hello '), t('woXrld', B))));
    expect(impl.insertText(state(doc(p(t('Bold', B))), at(0, 0)), 'A').doc).toEqual(doc(p(t('ABold', B))));

    // Backwards selection across two blocks.
    const replaced = impl.insertText(state(doc(p(t('Hello')), p(t('World'))), sel(1, 2, 0, 3)), 'p');
    expect(replaced.doc).toEqual(doc(p(t('Helprld'))));
    expect(replaced.selection).toEqual(at(0, 4));

    // A link is extended only strictly inside it, not at its end.
    const link = { link: 'https://example.com' };
    const linked = doc(p(t('see '), t('docs', link), t(' now')));
    expect(impl.insertText(state(linked, at(0, 8)), 's').doc).toEqual(doc(p(t('see '), t('docs', link), t('s now'))));
    expect(impl.insertText(state(linked, at(0, 6)), 'X').doc).toEqual(doc(p(t('see '), t('doXcs', link), t(' now'))));
  });

  it('deleteBackward removes one code point, merges blocks at a block start, and deletes ranges', () => {
    const one = impl.deleteBackward(state(doc(p(t('abc'))), at(0, 2)));
    expect(one.doc).toEqual(doc(p(t('ac'))));
    expect(one.selection).toEqual(at(0, 1));

    expect(impl.deleteBackward(state(doc(p(t('a👍'))), at(0, 3))).doc).toEqual(doc(p(t('a'))));

    const merged = impl.deleteBackward(state(doc(p(t('Hi', B)), p(t('there'))), at(1, 0)));
    expect(merged.doc).toEqual(doc(p(t('Hi', B), t('there'))));
    expect(merged.selection).toEqual(at(0, 2));

    const start = state(doc(p(t('abc'))), at(0, 0));
    expect(impl.deleteBackward(start).doc).toEqual(start.doc);

    const range = impl.deleteBackward(state(doc(p(t('ab'), t('cd', B), t('ef'))), sel(0, 1, 0, 5)));
    expect(range.doc).toEqual(doc(p(t('af'))));
    expect(range.selection).toEqual(at(0, 1));
  });

  it('splitBlock splits runs (keeping marks) and moves the cursor to the new block', () => {
    const split = impl.splitBlock(state(doc(p(t('Hello '), t('world', B))), at(0, 8)));
    expect(split.doc).toEqual(doc(p(t('Hello '), t('wo', B)), p(t('rld', B))));
    expect(split.selection).toEqual(at(1, 0));

    expect(impl.splitBlock(state(doc(p(t('end'))), at(0, 3))).doc).toEqual(doc(p(t('end')), p()));
    expect(impl.splitBlock(state(doc(p(t('abcdef'))), sel(0, 2, 0, 4))).doc).toEqual(doc(p(t('ab')), p(t('ef'))));
  });

  it('toggleMark adds a mark unless the whole range has it, keeps runs normalized, and works across blocks', () => {
    const base = doc(p(t('Hello world')));
    const bolded = impl.toggleMark(state(base, sel(0, 0, 0, 5)), 'bold');
    expect(bolded.doc).toEqual(doc(p(t('Hello', B), t(' world'))));
    expect(bolded.selection).toEqual(sel(0, 0, 0, 5));
    expect(impl.getActiveMarks(bolded)).toEqual({ bold: true });

    const partial = impl.toggleMark({ ...bolded, selection: sel(0, 3, 0, 8) }, 'bold');
    expect(impl.getActiveMarks({ ...bolded, selection: sel(0, 3, 0, 8) })).toEqual({});
    expect(partial.doc).toEqual(doc(p(t('Hello wo', B), t('rld'))));
    expect(impl.toggleMark(partial, 'bold').doc).toEqual(doc(p(t('Hel', B), t('lo world'))));

    const multi = impl.toggleMark(state(doc(p(t('ab')), p(t('cd'))), sel(0, 1, 1, 1)), 'italic');
    expect(multi.doc).toEqual(doc(p(t('a'), t('b', I)), p(t('c', I), t('d'))));
  });

  it('toggleMark at a collapsed cursor sets stored marks for the next typed text; setLink validates links', () => {
    const start = state(doc(p(t('Hi'))), at(0, 2));
    const toggled = impl.toggleMark(start, 'bold');
    expect(toggled.doc).toEqual(start.doc);
    expect(impl.getActiveMarks(toggled)).toEqual({ bold: true });

    const typed = impl.insertText(toggled, '!');
    expect(typed.doc).toEqual(doc(p(t('Hi'), t('!', B))));
    expect(impl.getActiveMarks(typed)).toEqual({ bold: true });

    const off = impl.toggleMark(typed, 'bold');
    expect(impl.getActiveMarks(off)).toEqual({});
    expect(impl.insertText(off, '?').doc).toEqual(doc(p(t('Hi'), t('!', B), t('?'))));

    const base = state(doc(p(t('docs here'))), sel(0, 0, 0, 4));
    const linked = impl.setLink(base, 'https://example.com/docs');
    expect(linked.doc).toEqual(doc(p(t('docs', { link: 'https://example.com/docs' }), t(' here'))));
    expect(impl.getActiveMarks(linked).link).toBe('https://example.com/docs');
    expect(impl.setLink(base, 'javascript:alert(1)').doc).toEqual(base.doc);
    expect(impl.setLink(linked, null).doc).toEqual(base.doc);
  });

  it('serializeToHTML uses canonical tags, escapes text and attributes, and drops unsafe links', () => {
    const html = impl.serializeToHTML(
      doc(
        p(
          t('a < b & "c" '),
          t('bold', B),
          t('all', { bold: true, italic: true, underline: true }),
          t('link', { bold: true, link: 'https://e.com/?a=1&b=2' }),
          t(' js', { link: 'javascript:alert(1)' }),
        ),
        p(),
      ),
    );
    expect(html).toBe(
      '<p>a &lt; b &amp; &quot;c&quot; <strong>bold</strong><strong><em><u>all</u></em></strong>' +
        '<a href="https://e.com/?a=1&amp;b=2"><strong>link</strong></a> js</p><p><br></p>',
    );
  });

  it('parseFromHTML sanitizes pasted HTML: drops scripts and styles, unwraps unknown tags, keeps known marks', () => {
    expect(
      impl.parseFromHTML(
        '<p>Hello <b>bold</b> <i>it</i><script>alert(1)</script><img src=x onerror="alert(1)"></p>' +
          '<style>p { color: red }</style><div onclick="steal()">Second <span style="color:red">line</span> <font>here</font></div>',
      ),
    ).toEqual(doc(p(t('Hello '), t('bold', B), t(' '), t('it', I)), p(t('Second line here'))));

    expect(
      impl.parseFromHTML('<p><a href="javascript:alert(1)">bad</a> <a href="https://ok.dev">good</a> <strong><em>x</em></strong><u>y</u></p>'),
    ).toEqual(doc(p(t('bad '), t('good', { link: 'https://ok.dev' }), t(' '), t('x', { bold: true, italic: true }), t('y', { underline: true }))));
  });

  it('parseFromHTML handles blocks, <br>, nesting and whitespace, and round-trips serializeToHTML', () => {
    expect(impl.parseFromHTML('<div>\n  <p>one\n   two</p>\n  <p>a<br>b</p><p><br></p>\n</div>')).toEqual(
      doc(p(t('one two')), p(t('a')), p(t('b')), p()),
    );
    expect(impl.parseFromHTML('')).toEqual(doc(p()));

    const original = doc(
      p(t('Tom & Jerry <3 '), t('bold', B), t(' and '), t('linked', { italic: true, link: 'https://example.com/a?b=1&c=2' })),
      p(),
      p(t('under', { underline: true })),
    );
    expect(impl.parseFromHTML(impl.serializeToHTML(original))).toEqual(original);
  });

  it('history groups consecutive typing within groupMs into one undo step', () => {
    const h = impl.createHistory(impl.createState(doc(p())), { groupMs: 500 });
    const edit = (fn: (s: EditorState) => EditorState, kind: 'typing' | 'deleting' | 'other', time: number) =>
      h.commit(fn(h.current()), kind, time);

    edit((s) => impl.insertText(s, 'a'), 'typing', 0);
    edit((s) => impl.insertText(s, 'b'), 'typing', 100);
    edit((s) => impl.insertText(s, 'c'), 'typing', 200);
    edit((s) => impl.insertText(s, 'd'), 'typing', 1000); // pause → new group
    edit((s) => impl.deleteBackward(s), 'deleting', 1100); // different kind → new group
    expect(texts(h.current().doc)).toEqual(['abc']);

    expect(texts(h.undo().doc)).toEqual(['abcd']);
    const abc = h.undo();
    expect(texts(abc.doc)).toEqual(['abc']);
    expect(abc.selection).toEqual(at(0, 3));
    expect(texts(h.undo().doc)).toEqual(['']);
    expect(h.canUndo()).toBe(false);
    expect(texts(h.undo().doc)).toEqual(['']);

    expect(texts(h.redo().doc)).toEqual(['abc']);
    expect(h.canRedo()).toBe(true);
    edit((s) => impl.insertText(s, 'x'), 'typing', 2000);
    expect(h.canRedo()).toBe(false);

    edit((s) => impl.splitBlock(s), 'other', 2001);
    edit((s) => impl.splitBlock(s), 'other', 2002);
    expect(h.undo().doc.blocks).toHaveLength(2);
  });
});

// ---------- view ----------
const type = (el: HTMLElement, inputType: string, data: string | null = null) =>
  fireEvent(el, new InputEvent('beforeinput', { inputType, data, bubbles: true, cancelable: true }));
const typeText = (el: HTMLElement, text: string) => [...text].forEach((ch) => type(el, 'insertText', ch));

describeTask('Editor view', () => {
  it('renders the document; toolbar buttons and Ctrl+B / Ctrl+I / Ctrl+U toggle the pressed marks', async () => {
    const user = userEvent.setup();
    render(<impl.default label="Notes" initialHTML="<p>plain <strong>bold</strong></p>" />);
    const textbox = screen.getByRole('textbox', { name: 'Notes' });
    expect(textbox).toHaveTextContent('plain bold');
    const toolbar = screen.getByRole('toolbar', { name: 'Formatting' });
    expect(within(toolbar).getByRole('button', { name: 'Bold' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(toolbar).getByRole('button', { name: 'Italic' })).toHaveAttribute('aria-pressed', 'false');
    expect(within(toolbar).getByRole('button', { name: 'Underline' })).toHaveAttribute('aria-pressed', 'false');
    expect(within(toolbar).getByRole('button', { name: 'Link' })).toHaveAttribute('aria-pressed', 'false');

    const button = (name: string) => within(toolbar).getByRole('button', { name });
    await user.click(button('Bold'));
    expect(button('Bold')).toHaveAttribute('aria-pressed', 'false');
    await user.click(button('Italic'));
    expect(button('Italic')).toHaveAttribute('aria-pressed', 'true');
    fireEvent.keyDown(textbox, { key: 'i', ctrlKey: true });
    expect(button('Italic')).toHaveAttribute('aria-pressed', 'false');
    fireEvent.keyDown(textbox, { key: 'u', ctrlKey: true });
    expect(button('Underline')).toHaveAttribute('aria-pressed', 'true');
    fireEvent.keyDown(textbox, { key: 'b', metaKey: true });
    expect(button('Bold')).toHaveAttribute('aria-pressed', 'true');
  });

  it('handles beforeinput through the model: typing, marks, Enter and Backspace', () => {
    const onChange = vi.fn();
    render(<impl.default label="Notes" initialHTML="<p>Hi</p>" onChange={onChange} />);
    const textbox = screen.getByRole('textbox', { name: 'Notes' });
    const lastDoc = (): Doc => onChange.mock.lastCall![0];

    typeText(textbox, ' there');
    expect(textbox).toHaveTextContent(/^Hi there$/);
    expect(lastDoc()).toEqual(doc(p(t('Hi there'))));

    fireEvent.keyDown(textbox, { key: 'b', ctrlKey: true });
    typeText(textbox, '!');
    expect(lastDoc()).toEqual(doc(p(t('Hi there'), t('!', B))));
    expect(screen.getByRole('button', { name: 'Bold' })).toHaveAttribute('aria-pressed', 'true');

    type(textbox, 'insertParagraph');
    typeText(textbox, 'x');
    expect(texts(lastDoc())).toEqual(['Hi there!', 'x']);

    type(textbox, 'deleteContentBackward');
    type(textbox, 'deleteContentBackward');
    expect(texts(lastDoc())).toEqual(['Hi there!']);
    expect(textbox).toHaveTextContent(/^Hi there!$/);
  });

  it('Ctrl+Z undoes a burst of typing as one step and Ctrl+Shift+Z redoes it', () => {
    const onChange = vi.fn();
    let clock = 0;
    render(<impl.default label="Notes" initialHTML="<p>Hi</p>" onChange={onChange} now={() => clock} />);
    const textbox = screen.getByRole('textbox', { name: 'Notes' });

    typeText(textbox, ' there');
    clock = 5_000;
    typeText(textbox, '!');
    expect(textbox).toHaveTextContent(/^Hi there!$/);

    fireEvent.keyDown(textbox, { key: 'z', ctrlKey: true });
    expect(textbox).toHaveTextContent(/^Hi there$/);
    fireEvent.keyDown(textbox, { key: 'z', ctrlKey: true });
    expect(textbox).toHaveTextContent(/^Hi$/);
    expect(onChange.mock.lastCall![0]).toEqual(doc(p(t('Hi'))));

    fireEvent.keyDown(textbox, { key: 'z', ctrlKey: true, shiftKey: true });
    expect(textbox).toHaveTextContent(/^Hi there$/);
  });
});
