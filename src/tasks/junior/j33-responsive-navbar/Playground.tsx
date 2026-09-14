import { useState, type ComponentType } from 'react';
import type { NavItem, NavbarProps } from './types';

const ITEMS: NavItem[] = [
  { label: 'Home', href: '/' },
  {
    label: 'Products',
    children: [
      { label: 'Analytics', href: '/products/analytics' },
      { label: 'Automation', href: '/products/automation' },
      { label: 'Integrations', href: '/products/integrations' },
    ],
  },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Docs', href: '/docs' },
  { label: 'About', href: '/about' },
];

type Mode = 'auto' | 'mobile' | 'desktop';

export default function Playground({ impl }: { impl: { default: ComponentType<NavbarProps> } }) {
  const Navbar = impl.default;
  const [current, setCurrent] = useState('/pricing');
  const [mode, setMode] = useState<Mode>('auto');
  const [log, setLog] = useState<string[]>([]);

  const isMobile = mode === 'auto' ? undefined : mode === 'mobile';

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      <fieldset style={{ display: 'flex', gap: 16, border: 0, padding: 0 }}>
        <legend>Layout</legend>
        {(['auto', 'mobile', 'desktop'] as const).map((m) => (
          <label key={m}>
            <input type="radio" name="navbar-mode" checked={mode === m} onChange={() => setMode(m)} /> {m}
            {m === 'auto' ? ' (matchMedia: resize the window across 768px)' : ''}
          </label>
        ))}
      </fieldset>

      <div style={{ border: '1px solid #d0d5dd', borderRadius: 8, overflow: 'hidden', minHeight: 320 }}>
        <Navbar
          brand="Acme Cloud"
          items={ITEMS}
          currentHref={current}
          isMobile={isMobile}
          onNavigate={(href) => {
            setCurrent(href);
            setLog((l) => [`navigate → ${href}`, ...l].slice(0, 6));
          }}
        />
        <main style={{ padding: 16 }}>
          <p>
            Current page: <code>{current}</code>
          </p>
          <button type="button">A focusable element after the navbar</button>
        </main>
      </div>

      <ul>
        {log.map((entry, i) => (
          <li key={i}>{entry}</li>
        ))}
      </ul>

      <section>
        <h3>Self-check</h3>
        <ul>
          <li>Tab through the closed mobile menu: focus must skip the hidden links.</li>
          <li>Open the menu, focus a link, press Escape: focus lands on the Menu button.</li>
          <li>Turn on a screen reader: "Pricing, current page" is announced.</li>
          <li>Enable reduced motion in your OS: the slide-in doesn't animate.</li>
        </ul>
      </section>
    </div>
  );
}
