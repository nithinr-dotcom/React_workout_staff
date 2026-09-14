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

function ToggleDemo({ impl }: { impl: Impl }) {
  const { useToggle } = impl;
  const [on, toggle, setOn] = useToggle(false);
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <strong>{on ? 'ON' : 'OFF'}</strong>
      <button onClick={toggle}>toggle()</button>
      <button onClick={() => setOn(false)}>setValue(false)</button>
    </div>
  );
}

function PreviousDemo({ impl }: { impl: Impl }) {
  const { usePrevious } = impl;
  const [count, setCount] = useState(0);
  const previous = usePrevious(count);
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <button onClick={() => setCount((c) => c + 1)}>+1</button>
      <span>
        now: <strong>{count}</strong> · previous: <strong>{String(previous)}</strong>
      </span>
    </div>
  );
}

function LocalStorageDemo({ impl }: { impl: Impl }) {
  const { useLocalStorage } = impl;
  const [name, setName, remove] = useLocalStorage('j25-demo-name', 'Guest');
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
      <label>
        Name <input value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <button onClick={remove}>remove()</button>
      <small>Reload the page: the value should survive. Open a second tab to try follow-up 1.</small>
    </div>
  );
}

function ClickOutsideDemo({ impl }: { impl: Impl }) {
  const { useClickOutside } = impl;
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useClickOutside(menuRef, () => setOpen(false));
  return (
    <div ref={menuRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        Menu
      </button>
      {open && (
        <ul style={{ position: 'absolute', margin: 0, padding: 8, listStyle: 'none', background: 'white', border: '1px solid #d0d5dd', borderRadius: 6 }}>
          <li>Profile</li>
          <li>Settings</li>
          <li>Sign out</li>
        </ul>
      )}
    </div>
  );
}

function DebounceDemo({ impl }: { impl: Impl }) {
  const { useDebounce } = impl;
  const [text, setText] = useState('');
  const debounced = useDebounce(text, 500);
  return (
    <div style={{ display: 'grid', gap: 4 }}>
      <input placeholder="Type quickly…" value={text} onChange={(e) => setText(e.target.value)} />
      <span>
        debounced (500ms): <strong>{JSON.stringify(debounced)}</strong>
      </span>
    </div>
  );
}

export default function Playground({ impl }: { impl: Impl }) {
  return (
    <div style={{ fontFamily: 'system-ui', display: 'grid', gap: 12, maxWidth: 560 }}>
      <DemoBoundary title="useToggle">
        <ToggleDemo impl={impl} />
      </DemoBoundary>
      <DemoBoundary title="usePrevious">
        <PreviousDemo impl={impl} />
      </DemoBoundary>
      <DemoBoundary title="useLocalStorage">
        <LocalStorageDemo impl={impl} />
      </DemoBoundary>
      <DemoBoundary title="useClickOutside">
        <ClickOutsideDemo impl={impl} />
      </DemoBoundary>
      <DemoBoundary title="useDebounce">
        <DebounceDemo impl={impl} />
      </DemoBoundary>
    </div>
  );
}
