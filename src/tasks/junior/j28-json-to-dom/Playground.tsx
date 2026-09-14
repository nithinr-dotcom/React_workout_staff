import { useEffect, useRef, useState } from 'react';
import type { RendererModule, VNode } from './types';

// Handlers can't live in JSON, so string values like "onClick": "alert:Saved!" are turned into functions for the demo.
const SAMPLE = `{
  "type": "div",
  "props": { "className": "card", "style": { "padding": "12px", "border": "1px solid #d0d5dd", "borderRadius": "8px" } },
  "children": [
    { "type": "h3", "props": { "style": { "marginTop": "0" } }, "children": ["Server-driven UI"] },
    { "type": "label", "props": { "htmlFor": "demo-name" }, "children": ["Name "] },
    { "type": "input", "props": { "id": "demo-name", "placeholder": "Ada", "required": true } },
    { "type": "p", "children": ["Items in cart: ", 0, " ", false, "(0 shows, false doesn't)"] },
    { "type": "p", "children": ["<b>This is text, not HTML</b>"] },
    { "type": "button", "props": { "type": "button", "onClick": "log:Saved!", "style": { "color": "white", "background": "#4f46e5", "border": "0", "padding": "6px 12px", "borderRadius": "6px" } }, "children": ["Save"] }
  ]
}`;

export default function Playground({ impl }: { impl: RendererModule }) {
  const [source, setSource] = useState(SAMPLE);
  const [log, setLog] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [serialized, setSerialized] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let vnode: VNode;
    try {
      vnode = JSON.parse(source, (key, value) =>
        /^on[A-Z]/.test(key) && typeof value === 'string' && value.startsWith('log:')
          ? () => setLog((l) => [`${new Date().toLocaleTimeString()} ${value.slice(4)}`, ...l].slice(0, 8))
          : value,
      );
    } catch (e) {
      setError(`Invalid JSON: ${(e as Error).message}`);
      return;
    }
    try {
      impl.render(vnode, container);
      setError(null);
    } catch (e) {
      container.replaceChildren();
      setError((e as Error).message);
    }
  }, [impl, source]);

  return (
    <div style={{ fontFamily: 'system-ui', display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
      <label style={{ display: 'grid', gap: 4 }}>
        VNode JSON (use &quot;onClick&quot;: &quot;log:message&quot; for handlers)
        <textarea
          value={source}
          onChange={(e) => setSource(e.target.value)}
          spellCheck={false}
          rows={22}
          style={{ fontFamily: 'monospace', fontSize: 12 }}
        />
      </label>
      <div style={{ display: 'grid', gap: 8, alignContent: 'start' }}>
        <strong>Rendered output</strong>
        {error && <p style={{ color: '#b91c1c', margin: 0 }}>Error: {error}</p>}
        <div ref={containerRef} />
        <strong>Event log</strong>
        <ol style={{ fontFamily: 'monospace', fontSize: 12, margin: 0 }}>
          {log.map((l, i) => (
            <li key={i}>{l}</li>
          ))}
        </ol>
        <button
          onClick={() => {
            const node = containerRef.current?.firstChild;
            try {
              setSerialized(node ? JSON.stringify(impl.serialize(node), null, 2) : 'Nothing rendered');
            } catch (e) {
              setSerialized(`Error: ${(e as Error).message}`);
            }
          }}
        >
          serialize() output (follow-up 1)
        </button>
        {serialized && <pre style={{ fontSize: 12, background: '#f9fafb', padding: 8, overflow: 'auto' }}>{serialized}</pre>}
      </div>
    </div>
  );
}
