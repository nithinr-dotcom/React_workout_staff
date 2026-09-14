import { useRef, useState, type MouseEvent } from 'react';
import type { DomTraversalModule } from './types';

const FIXTURE = `
  <style>.pg-muted { color: gray; } .pg-row { display: flex; gap: 6px; }</style>
  <article class="card">
    <h4 class="title">Card title</h4>
    <div class="pg-row">
      <button class="btn primary">Save</button>
      <button class="btn">Cancel</button>
      <button class="btn-link">Help</button>
    </div>
    <p class="pg-muted">Muted text <span class="badge">new</span></p>
    <p style="color: red">Red paragraph <b>bold child</b></p>
  </article>
`;

type Result = { label: string; nodes: Element[] } | { label: string; error: string };

export default function Playground({ impl }: { impl: DomTraversalModule }) {
  const treeA = useRef<HTMLDivElement>(null);
  const treeB = useRef<HTMLDivElement>(null);
  const [classNames, setClassNames] = useState('btn primary');
  const [property, setProperty] = useState('color');
  const [value, setValue] = useState('red');
  const [result, setResult] = useState<Result | null>(null);

  const clearHighlights = () => {
    for (const root of [treeA.current, treeB.current]) {
      root?.querySelectorAll('[data-pg-hit]').forEach((el) => {
        (el as HTMLElement).style.outline = '';
        el.removeAttribute('data-pg-hit');
      });
    }
  };

  const highlight = (nodes: Element[]) => {
    for (const el of nodes) {
      (el as HTMLElement).style.outline = '2px solid #4f46e5';
      el.setAttribute('data-pg-hit', '');
    }
  };

  const run = (label: string, fn: () => Element[]) => {
    clearHighlights();
    try {
      const nodes = fn();
      highlight(nodes);
      setResult({ label, nodes });
    } catch (e) {
      setResult({ label, error: (e as Error).message });
    }
  };

  const onTreeClick = (event: MouseEvent<HTMLDivElement>) => {
    if (!treeA.current || !treeB.current) return;
    const target = event.target as Node;
    run('findCorrespondingNode(clicked)', () => {
      const found = impl.findCorrespondingNode(treeA.current!, treeB.current!, target);
      return found instanceof Element ? [found] : [];
    });
  };

  return (
    <div style={{ fontFamily: 'system-ui', display: 'grid', gap: 12, maxWidth: 720 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'end' }}>
        <label>
          classNames{' '}
          <input value={classNames} onChange={(e) => setClassNames(e.target.value)} />
        </label>
        <button type="button" onClick={() => run(`getElementsByClassName("${classNames}")`, () => impl.getElementsByClassName(treeA.current!, classNames))}>
          getElementsByClassName
        </button>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'end' }}>
        <label>
          property <input value={property} onChange={(e) => setProperty(e.target.value)} />
        </label>
        <label>
          value <input value={value} onChange={(e) => setValue(e.target.value)} />
        </label>
        <button type="button" onClick={() => run(`getElementsByStyle("${property}", "${value}")`, () => impl.getElementsByStyle(treeA.current!, property, value))}>
          getElementsByStyle
        </button>
        <button type="button" onClick={clearHighlights}>
          clear
        </button>
      </div>
      <p style={{ margin: 0, color: '#667085', fontSize: 13 }}>
        Click any element in tree A to highlight its corresponding node in tree B.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <strong>Tree A</strong>
          {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
          <div ref={treeA} onClick={onTreeClick} style={{ border: '1px dashed #d0d5dd', padding: 8 }} dangerouslySetInnerHTML={{ __html: FIXTURE }} />
        </div>
        <div>
          <strong>Tree B</strong>
          <div ref={treeB} style={{ border: '1px dashed #d0d5dd', padding: 8 }} dangerouslySetInnerHTML={{ __html: FIXTURE }} />
        </div>
      </div>
      {result && (
        <div style={{ fontFamily: 'monospace', fontSize: 13 }}>
          <div>{result.label}</div>
          {'error' in result ? (
            <div style={{ color: '#b91c1c' }}>Error: {result.error}</div>
          ) : (
            <div>
              → {result.nodes.length} match(es):{' '}
              {result.nodes.map((n) => `<${n.tagName.toLowerCase()}${n.className ? ` class="${n.className}"` : ''}>`).join(', ')}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
