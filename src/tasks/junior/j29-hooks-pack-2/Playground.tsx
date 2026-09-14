import { Component, useRef, useState, type ReactNode } from 'react';
import type { HooksModule } from './types';

type Impl = HooksModule;

// Each demo gets its own boundary, so a hook that still throws "not implemented" only breaks its own card.
class DemoBoundary extends Component<{ title: string; children: ReactNode }, { error: string | null }> {
  state = { error: null as string | null };
  static getDerivedStateFromError(error: Error) {
    return { error: error.message };
  }
  render() {
    return (
      <section style={{ border: '1px solid #d0d5dd', borderRadius: 8, padding: 12 }}>
        <h3 style={{ marginTop: 0, fontFamily: 'monospace' }}>{this.props.title}</h3>
        {this.state.error ? <p style={{ color: '#b91c1c' }}>Error: {this.state.error}</p> : this.props.children}
      </section>
    );
  }
}

const row = { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' } as const;

function IntervalDemo({ impl }: { impl: Impl }) {
  const [running, setRunning] = useState(true);
  const [delay, setDelay] = useState(500);
  const [ticks, setTicks] = useState(0);
  // A new inline callback every render: the interval must not restart because of it.
  impl.useInterval(() => setTicks(ticks + 1), running ? delay : null);
  return (
    <div style={row}>
      <strong>ticks: {ticks}</strong>
      <button onClick={() => setRunning((r) => !r)}>{running ? 'Pause (delay = null)' : 'Resume'}</button>
      <label>
        delay {delay}ms <input type="range" min={100} max={2000} step={100} value={delay} onChange={(e) => setDelay(Number(e.target.value))} />
      </label>
    </div>
  );
}

function TimeoutDemo({ impl }: { impl: Impl }) {
  const [message, setMessage] = useState('waiting 3s…');
  const { clear, reset } = impl.useTimeout(() => setMessage('fired!'), 3000);
  return (
    <div style={row}>
      <strong>{message}</strong>
      <button onClick={clear}>clear()</button>
      <button
        onClick={() => {
          setMessage('waiting 3s…');
          reset();
        }}
      >
        reset()
      </button>
    </div>
  );
}

function ThrottleDemo({ impl }: { impl: Impl }) {
  const [x, setX] = useState(0);
  const throttled = impl.useThrottle(x, 500);
  return (
    <div
      onMouseMove={(e) => setX(Math.round(e.nativeEvent.offsetX))}
      style={{ height: 80, background: '#f2f4f7', borderRadius: 6, padding: 8 }}
    >
      Move the mouse here · raw x: <strong>{x}</strong> · throttled (500ms): <strong>{throttled}</strong>
    </div>
  );
}

function WindowSizeDemo({ impl }: { impl: Impl }) {
  const { width, height } = impl.useWindowSize();
  return (
    <p style={{ margin: 0 }}>
      {width} × {height} <small>(resize the browser window)</small>
    </p>
  );
}

function MediaQueryDemo({ impl }: { impl: Impl }) {
  const narrow = impl.useMediaQuery('(max-width: 700px)');
  const dark = impl.useMediaQuery('(prefers-color-scheme: dark)');
  return (
    <p style={{ margin: 0 }}>
      (max-width: 700px): <strong>{String(narrow)}</strong> · prefers dark: <strong>{String(dark)}</strong>
    </p>
  );
}

function HoverDemo({ impl }: { impl: Impl }) {
  const ref = useRef<HTMLDivElement>(null);
  const hovered = impl.useHover(ref);
  return (
    <div ref={ref} style={{ padding: 16, borderRadius: 6, background: hovered ? '#d1fadf' : '#f2f4f7' }}>
      hovered: <strong>{String(hovered)}</strong>
    </div>
  );
}

function EventListenerDemo({ impl }: { impl: Impl }) {
  const [lastKey, setLastKey] = useState('(press a key)');
  impl.useEventListener<KeyboardEvent>(typeof window === 'undefined' ? null : window, 'keydown', (e) => setLastKey(e.key));
  return (
    <p style={{ margin: 0 }}>
      last key on window: <strong>{lastKey}</strong>
    </p>
  );
}

function FirstRenderDemo({ impl }: { impl: Impl }) {
  const [count, setCount] = useState(0);
  const [log, setLog] = useState<string[]>([]);
  const isFirst = impl.useIsFirstRender();
  impl.useUpdateEffect(() => {
    setLog((l) => [`count changed to ${count}`, ...l].slice(0, 5));
  }, [count]);
  return (
    <div style={{ display: 'grid', gap: 4 }}>
      <div style={row}>
        <button onClick={() => setCount((c) => c + 1)}>count: {count}</button>
        <span>
          useIsFirstRender(): <strong>{String(isFirst)}</strong>
        </span>
      </div>
      <small>useUpdateEffect log (nothing on mount):</small>
      <ul style={{ margin: 0, fontFamily: 'monospace', fontSize: 13 }}>
        {log.map((l, i) => (
          <li key={i}>{l}</li>
        ))}
      </ul>
    </div>
  );
}

export default function Playground({ impl }: { impl: Impl }) {
  return (
    <div style={{ fontFamily: 'system-ui', display: 'grid', gap: 12, maxWidth: 600 }}>
      <DemoBoundary title="useInterval">
        <IntervalDemo impl={impl} />
      </DemoBoundary>
      <DemoBoundary title="useTimeout">
        <TimeoutDemo impl={impl} />
      </DemoBoundary>
      <DemoBoundary title="useThrottle">
        <ThrottleDemo impl={impl} />
      </DemoBoundary>
      <DemoBoundary title="useWindowSize">
        <WindowSizeDemo impl={impl} />
      </DemoBoundary>
      <DemoBoundary title="useMediaQuery">
        <MediaQueryDemo impl={impl} />
      </DemoBoundary>
      <DemoBoundary title="useHover">
        <HoverDemo impl={impl} />
      </DemoBoundary>
      <DemoBoundary title="useEventListener">
        <EventListenerDemo impl={impl} />
      </DemoBoundary>
      <DemoBoundary title="useIsFirstRender + useUpdateEffect">
        <FirstRenderDemo impl={impl} />
      </DemoBoundary>
    </div>
  );
}
