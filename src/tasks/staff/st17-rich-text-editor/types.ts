import type { ComponentType } from 'react';

/*
 * Minimal public contract. The tests and Playground depend on everything here.
 * You may add options, fields and exports (API design is part of the exercise), but don't break these.
 */

export type MarkType = 'bold' | 'italic' | 'underline';

/** Only keys that are set are present: `{ bold: true }`, never `{ bold: false }` or `{ bold: undefined }`. */
export interface Marks {
  bold?: true;
  italic?: true;
  underline?: true;
  /** Link target. Only http:, https: and mailto: URLs are allowed. */
  link?: string;
}

export interface TextRun {
  /** Never empty in a normalized document. */
  text: string;
  marks: Marks;
}

export interface Block {
  type: 'paragraph';
  /** Normalized: no empty runs, and no two adjacent runs with equal marks. An empty paragraph has `runs: []`. */
  runs: TextRun[];
}

export interface Doc {
  /** Always at least one block. */
  blocks: Block[];
}

/** `offset` counts UTF-16 code units in the block's plain text (the concatenation of its runs). */
export interface Point {
  block: number;
  offset: number;
}

/** `anchor` is where the selection started, `focus` where it ends. Either may come first (backwards selections). */
export interface Selection {
  anchor: Point;
  focus: Point;
}

export interface EditorState {
  doc: Doc;
  selection: Selection;
  /** Marks for the next typed text at a collapsed cursor, set by toggling a mark with no selection. */
  storedMarks?: Marks | null;
}

export type EditKind = 'typing' | 'deleting' | 'other';

export interface HistoryOptions {
  /** Consecutive edits of the same kind closer together than this are merged into one undo step. Default 500. */
  groupMs?: number;
}

export interface EditorHistory {
  /** The current state. */
  current(): EditorState;
  /** Record a new state produced by an edit of `kind` at time `time` (ms). Clears the redo stack. */
  commit(next: EditorState, kind: EditKind, time: number): void;
  /** Step back one undo group and return the new current state (unchanged if there is nothing to undo). */
  undo(): EditorState;
  /** Step forward one undo group and return the new current state (unchanged if there is nothing to redo). */
  redo(): EditorState;
  canUndo(): boolean;
  canRedo(): boolean;
}

export interface RichTextEditorProps {
  /** Accessible name of the editable area. */
  label: string;
  /** Parsed with `parseFromHTML`. Default: one empty paragraph. */
  initialHTML?: string;
  /** Called with the new document after every change to it (not for selection-only changes). */
  onChange?: (doc: Doc) => void;
  /** Asks for a link URL. Default `window.prompt`. Return `null` to cancel, `''` to remove the link. */
  promptForLink?: (currentHref: string | undefined) => string | null;
  /** Clock for undo grouping. Default `Date.now`. */
  now?: () => number;
}

export interface RichTextModule {
  createState(doc: Doc, selection?: Selection): EditorState;
  insertText(state: EditorState, text: string): EditorState;
  deleteBackward(state: EditorState): EditorState;
  splitBlock(state: EditorState): EditorState;
  toggleMark(state: EditorState, mark: MarkType): EditorState;
  setLink(state: EditorState, href: string | null): EditorState;
  getActiveMarks(state: EditorState): Marks;
  serializeToHTML(doc: Doc): string;
  parseFromHTML(html: string): Doc;
  createHistory(initial: EditorState, options?: HistoryOptions): EditorHistory;
  default: ComponentType<RichTextEditorProps>;
}
