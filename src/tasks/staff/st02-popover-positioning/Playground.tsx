import { Component, useState, type ReactNode } from 'react';
import type { Placement, PopoverModule } from './types';

class DemoBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    return this.state.error ? <p style={{ color: '#b91c1c' }}>Error: {this.state.error.message}</p> : this.props.children;
  }
}

const PLACEMENTS: Placement[] = [
  'top', 'top-start', 'top-end', 'bottom', 'bottom-start', 'bottom-end',
  'left', 'left-start', 'left-end', 'right', 'right-start', 'right-end',
];

const VIEWPORT = { x: 0, y: 0, width: 420, height: 260 };

/** Visualises the pure function inside a fake 420×260 "viewport". */
function Visualizer({ impl }: { impl: PopoverModule }) {
  const [ax, setAx] = useState(180);
  const [ay, setAy] = useState(110);
  const [placement, setPlacement] = useState<Placement>('bottom');
  const [flip, setFlip] = useState(true);
  const [shift, setShift] = useState(true);
  const [offset, setOffset] = useState(8);
  const anchor = { x: ax, y: ay, width: 60, height: 28 };
  const floating = { width: 140, height: 70 };

  let result: ReturnType<PopoverModule['computePosition']> | null = null;
  let error: string | null = null;
  try {
    result = impl.computePosition(anchor, floating, VIEWPORT, { placement, flip, shift, offset, padding: 6 });
  } catch (e) {
    error = (e as Error).message;
  }

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
        <label>
          Anchor x <input type="range" min={0} max={VIEWPORT.width - 60} value={ax} onChange={(e) => setAx(+e.target.value)} />
        </label>
        <label>
          Anchor y <input type="range" min={0} max={VIEWPORT.height - 28} value={ay} onChange={(e) => setAy(+e.target.value)} />
        </label>
        <label>
          Placement{' '}
          <select value={placement} onChange={(e) => setPlacement(e.target.value as Placement)}>
            {PLACEMENTS.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </label>
        <label>
          Offset <input type="number" value={offset} style={{ width: 50 }} onChange={(e) => setOffset(+e.target.value)} />
        </label>
        <label>
          <input type="checkbox" checked={flip} onChange={(e) => setFlip(e.target.checked)} /> flip
        </label>
        <label>
          <input type="checkbox" checked={shift} onChange={(e) => setShift(e.target.checked)} /> shift
        </label>
      </div>
      <div
        style={{
          position: 'relative',
          width: VIEWPORT.width,
          height: VIEWPORT.height,
          border: '2px dashed #98a2b3',
          background: '#f9fafb',
          overflow: 'visible',
        }}
      >
        <div style={{ position: 'absolute', left: ax, top: ay, width: 60, height: 28, background: '#4f46e5', color: 'white', fontSize: 12, display: 'grid', placeItems: 'center' }}>
          anchor
        </div>
        {result && (
          <div
            style={{
              position: 'absolute',
              left: result.x,
              top: result.y,
              width: floating.width,
              height: floating.height,
              background: 'rgba(16,185,129,0.25)',
              border: '1px solid #10b981',
              fontSize: 12,
              padding: 4,
              boxSizing: 'border-box',
            }}
          >
            {result.placement}
            <br />({Math.round(result.x)}, {Math.round(result.y)})
          </div>
        )}
      </div>
      {error && <p style={{ color: '#b91c1c' }}>Error: {error}</p>}
    </div>
  );
}

function PopoverDemo({ impl }: { impl: PopoverModule }) {
  const [open, setOpen] = useState(false);
  const popover = impl.usePopover({ open, placement: 'bottom-start', offset: 6, padding: 8 });
  return (
    <div>
      <button type="button" ref={popover.anchorRef} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        Account menu
      </button>
      {open && (
        <div
          ref={popover.floatingRef}
          role="dialog"
          aria-label="Account"
          style={{ ...popover.style, width: 220, padding: 12, background: 'white', border: '1px solid #d0d5dd', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,.12)', zIndex: 10 }}
        >
          <strong>Signed in as Priya</strong>
          <p style={{ margin: '8px 0 0' }}>Placement used: {popover.placement}. Scroll or resize the window to see it follow.</p>
        </div>
      )}
    </div>
  );
}

export default function Playground({ impl }: { impl: PopoverModule }) {
  const { Tooltip } = impl;
  return (
    <div style={{ display: 'grid', gap: 28, fontFamily: 'system-ui' }}>
      <section>
        <h3>computePosition (pure)</h3>
        <Visualizer impl={impl} />
      </section>
      <section>
        <h3>usePopover</h3>
        <DemoBoundary>
          <PopoverDemo impl={impl} />
        </DemoBoundary>
      </section>
      <section>
        <h3>Tooltip (hover, focus, Escape)</h3>
        <DemoBoundary>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
            <Tooltip content="Copy link to clipboard">
              <button type="button">Copy</button>
            </Tooltip>
            <Tooltip content="Opens in a new tab" placement="top" openDelay={0}>
              <button type="button">No delay (top)</button>
            </Tooltip>
            <Tooltip content="I flip or shift near the edge" placement="right">
              <button type="button">Right edge</button>
            </Tooltip>
          </div>
        </DemoBoundary>
      </section>
    </div>
  );
}
