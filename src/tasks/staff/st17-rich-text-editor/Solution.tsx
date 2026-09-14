import type {
  Doc,
  EditorHistory,
  EditorState,
  HistoryOptions,
  MarkType,
  Marks,
  RichTextEditorProps,
  Selection,
} from './types';
import styles from './Solution.module.css';

// ⬇ Delete this line when you start. Tests for this task are skipped while it exists.
export const NOT_STARTED = true;

// Your implementation here. Requirements are in README.md.

// ---------- Model (pure) ----------

export function createState(doc: Doc, selection?: Selection): EditorState {
  void doc;
  void selection;
  throw new Error('createState: not implemented');
}

export function insertText(state: EditorState, text: string): EditorState {
  void state;
  void text;
  throw new Error('insertText: not implemented');
}

export function deleteBackward(state: EditorState): EditorState {
  void state;
  throw new Error('deleteBackward: not implemented');
}

export function splitBlock(state: EditorState): EditorState {
  void state;
  throw new Error('splitBlock: not implemented');
}

export function toggleMark(state: EditorState, mark: MarkType): EditorState {
  void state;
  void mark;
  throw new Error('toggleMark: not implemented');
}

export function setLink(state: EditorState, href: string | null): EditorState {
  void state;
  void href;
  throw new Error('setLink: not implemented');
}

export function getActiveMarks(state: EditorState): Marks {
  void state;
  throw new Error('getActiveMarks: not implemented');
}

export function serializeToHTML(doc: Doc): string {
  void doc;
  throw new Error('serializeToHTML: not implemented');
}

export function parseFromHTML(html: string): Doc {
  void html;
  throw new Error('parseFromHTML: not implemented');
}

export function createHistory(initial: EditorState, options?: HistoryOptions): EditorHistory {
  void initial;
  void options;
  throw new Error('createHistory: not implemented');
}

// ---------- View ----------

export default function RichTextEditor({ label, initialHTML, onChange, promptForLink, now }: RichTextEditorProps) {
  void label;
  void initialHTML;
  void onChange;
  void promptForLink;
  void now;
  return <div className={styles.root}>RichTextEditor: start coding in Solution.tsx</div>;
}
