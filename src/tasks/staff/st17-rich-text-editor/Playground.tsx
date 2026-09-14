import { Component, useState, type ReactNode } from 'react';
import type { Doc, RichTextModule } from './types';

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) return <p style={{ color: '#b91c1c' }}>Error: {this.state.error.message}</p>;
    return this.props.children;
  }
}

const INITIAL_HTML =
  '<p>Welcome to the <strong>model-driven</strong> editor. Try <em>Ctrl+B</em>, <u>Ctrl+U</u> and a <a href="https://www.w3.org/TR/input-events-2/">link</a>.</p><p><br></p><p>Type a sentence, pause, type another, then press Ctrl+Z twice.</p>';

const PASTE_SAMPLE =
  '<div class="docs-internal"><p>Pasted from <b>Google Docs</b> <span style="font-weight:700">(span bold)</span></p><script>alert("xss")</script><p><a href="javascript:alert(1)">evil link</a> and <a href="https://example.com">good link</a></p><img src=x onerror="alert(1)"><ul><li>list item one</li><li>list <i>item</i> two</li></ul></div>';

const CHECKLIST = [
  'Click in the middle of a word and type: the caret stays where you typed.',
  'Select across two paragraphs and type a letter: both are merged and the caret follows.',
  'Double-click a word, press Ctrl+B, and the Bold button shows pressed.',
  'Put the caret at the end of the bold word: Bold is pressed. Move it one character right: it is not.',
  'Enter at the start, middle and end of a paragraph. Backspace at the start of a paragraph merges it.',
  'Select text, click Link, enter a URL; select it again and the Link button is pressed.',
  'Paste the sample HTML below into the editor: no script runs, and only known marks survive.',
  'Type an emoji, then Backspace once: the whole emoji disappears.',
];

function ModelInspector({ impl, doc }: { impl: RichTextModule; doc: Doc | null }) {
  if (!doc) return <p style={{ color: '#475467' }}>Edit the document to see the model.</p>;
  let html = '';
  try {
    html = impl.serializeToHTML(doc);
  } catch (e) {
    html = `Error: ${(e as Error).message}`;
  }
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <strong>serializeToHTML(doc)</strong>
      <code style={{ whiteSpace: 'pre-wrap', fontSize: 12 }}>{html}</code>
      <strong>doc</strong>
      <pre style={{ fontSize: 12, maxHeight: 240, overflow: 'auto', margin: 0 }}>{JSON.stringify(doc, null, 1)}</pre>
    </div>
  );
}

function PasteSandbox({ impl }: { impl: RichTextModule }) {
  const [input, setInput] = useState(PASTE_SAMPLE);
  let output: string;
  try {
    output = impl.serializeToHTML(impl.parseFromHTML(input));
  } catch (e) {
    output = `Error: ${(e as Error).message}`;
  }
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <label style={{ display: 'grid', gap: 4 }}>
        Untrusted HTML
        <textarea rows={5} value={input} onChange={(e) => setInput(e.target.value)} style={{ fontFamily: 'monospace', fontSize: 12 }} />
      </label>
      <strong>serializeToHTML(parseFromHTML(html))</strong>
      <code style={{ whiteSpace: 'pre-wrap', fontSize: 12 }}>{output}</code>
    </div>
  );
}

export default function Playground({ impl }: { impl: RichTextModule }) {
  const Editor = impl.default;
  const [doc, setDoc] = useState<Doc | null>(null);
  const [links, setLinks] = useState<string[]>([]);
  return (
    <div style={{ fontFamily: 'system-ui', display: 'grid', gap: 20, maxWidth: 760 }}>
      <ErrorBoundary>
        <Editor
          label="Document"
          initialHTML={INITIAL_HTML}
          onChange={setDoc}
          promptForLink={(current) => {
            const href = window.prompt('Link URL (empty to remove)', current ?? 'https://');
            if (href !== null) setLinks((l) => [href, ...l].slice(0, 3));
            return href;
          }}
        />
      </ErrorBoundary>
      {links.length > 0 && <small>Recent link prompts: {links.join(' · ')}</small>}

      <section>
        <h4 style={{ margin: '0 0 8px' }}>Manual checks (selection mapping isn’t covered by jsdom tests)</h4>
        <ol style={{ margin: 0, paddingLeft: 20, display: 'grid', gap: 4 }}>
          {CHECKLIST.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
      </section>

      <section>
        <h4 style={{ margin: '0 0 8px' }}>Model</h4>
        <ErrorBoundary>
          <ModelInspector impl={impl} doc={doc} />
        </ErrorBoundary>
      </section>

      <section>
        <h4 style={{ margin: '0 0 8px' }}>Paste sanitizer</h4>
        <ErrorBoundary>
          <PasteSandbox impl={impl} />
        </ErrorBoundary>
      </section>
    </div>
  );
}
