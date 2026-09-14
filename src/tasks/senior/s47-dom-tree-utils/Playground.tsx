import { useRef, useState, type MouseEvent } from 'react';
import type { DomTreeUtilsModule, TocEntry } from './types';

const DOC = `
<article>
  <h1>Release notes</h1>
  <p>Everything that shipped this quarter.</p>
  <h2>What's new?</h2>
  <section>
    <h3>Faster search</h3>
    <p>Indexes are <b>3×</b> smaller.</p>
    <h3>Dark mode</h3>
  </section>
  <h4>Skipped a level</h4>
  <h2 id="fixes">Bug fixes</h2>
  <h2>What's new?</h2>
  <ul><li>One</li><li>Two <i>three</i></li></ul>
</article>`;

// Same elements, different formatting and text, as if re-serialized.
const DOC_CLONE = DOC.replace(/\n\s*/g, '').replace(/>([^<]+)</g, (_, t: string) => `><!--x-->${t.toUpperCase()}<`);

function Outline({ entries }: { entries: TocEntry[] }) {
  if (!entries.length) return null;
  return (
    <ol>
      {entries.map((e, i) => (
        <li key={`${e.id}-${i}`}>
          {e.text} <code style={{ color: '#667085' }}>
            h{e.level} #{e.id}
          </code>
          <Outline entries={e.children} />
        </li>
      ))}
    </ol>
  );
}

export default function Playground({ impl }: { impl: DomTreeUtilsModule }) {
  const treeA = useRef<HTMLDivElement>(null);
  const treeB = useRef<HTMLDivElement>(null);
  const [output, setOutput] = useState<{ label: string; toc?: TocEntry[]; text?: string; error?: string } | null>(null);

  const run = (label: string, fn: () => { toc?: TocEntry[]; text?: string }) => {
    try {
      setOutput({ label, ...fn() });
    } catch (e) {
      setOutput({ label, error: (e as Error).message });
    }
  };

  const onTreeClick = (event: MouseEvent<HTMLDivElement>) => {
    const a = treeA.current;
    const b = treeB.current;
    if (!a || !b || !(event.target instanceof Element)) return;
    const target = event.target;
    b.querySelectorAll('[data-pg-hit]').forEach((el) => {
      (el as HTMLElement).style.outline = '';
      el.removeAttribute('data-pg-hit');
    });
    run('findCorrespondingNode(clicked)', () => {
      const found = impl.findCorrespondingNode(a, b, target);
      if (found instanceof HTMLElement) {
        found.style.outline = '2px solid #4f46e5';
        found.setAttribute('data-pg-hit', '');
      }
      return { text: found ? `<${found.tagName.toLowerCase()}> "${found.textContent?.slice(0, 40)}"` : 'null' };
    });
  };

  return (
    <div style={{ fontFamily: 'system-ui', display: 'grid', gap: 12, maxWidth: 760 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button type="button" onClick={() => run('getTableOfContents(A)', () => ({ toc: impl.getTableOfContents(treeA.current!) }))}>
          getTableOfContents
        </button>
        <button type="button" onClick={() => run('getTreeHeight(A)', () => ({ text: String(impl.getTreeHeight(treeA.current!)) }))}>
          getTreeHeight
        </button>
        <button
          type="button"
          onClick={() =>
            run('levelOrder(A)', () => ({
              text: impl
                .levelOrder(treeA.current!)
                .map((level, i) => `${i}: ${level.join(' ')}`)
                .join('\n'),
            }))
          }
        >
          levelOrder
        </button>
      </div>
      <p style={{ margin: 0, color: '#667085', fontSize: 13 }}>
        Click any element in tree A to outline its twin in tree B. Tree B has no whitespace, extra comments and uppercased text.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <strong>Tree A</strong>
          {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
          <div ref={treeA} onClick={onTreeClick} style={{ border: '1px dashed #d0d5dd', padding: 8, fontSize: 13 }} dangerouslySetInnerHTML={{ __html: DOC }} />
        </div>
        <div>
          <strong>Tree B</strong>
          <div ref={treeB} style={{ border: '1px dashed #d0d5dd', padding: 8, fontSize: 13 }} dangerouslySetInnerHTML={{ __html: DOC_CLONE }} />
        </div>
      </div>
      {output && (
        <div style={{ fontSize: 13 }}>
          <div style={{ fontFamily: 'monospace' }}>{output.label}</div>
          {output.error && <div style={{ color: '#b91c1c' }}>Error: {output.error}</div>}
          {output.text !== undefined && <pre style={{ margin: 0 }}>{output.text}</pre>}
          {output.toc && (output.toc.length ? <Outline entries={output.toc} /> : <p>(no headings)</p>)}
        </div>
      )}
    </div>
  );
}
