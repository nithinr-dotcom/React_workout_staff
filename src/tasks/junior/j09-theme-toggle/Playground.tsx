import type { ThemeToggleModule } from './types';

const DEMO_CSS = `
.j09-demo {
  --bg: #ffffff;
  --fg: #101828;
  --muted: #667085;
  --card: #f9fafb;
  --border: #d0d5dd;
  background: var(--bg);
  color: var(--fg);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 20px;
  display: grid;
  gap: 16px;
  transition: background 0.2s, color 0.2s;
}
[data-theme='dark'] .j09-demo {
  --bg: #0b1220;
  --fg: #e4e7ec;
  --muted: #98a2b3;
  --card: #151f32;
  --border: #344054;
}
.j09-card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 12px 16px;
}
.j09-muted { color: var(--muted); }
`;

function Status({ impl }: { impl: ThemeToggleModule }) {
  // The starter's useTheme throws; show that instead of crashing the Playground.
  let text: string;
  try {
    const { theme, resolvedTheme } = impl.useTheme();
    text = `preference: ${theme} · resolved: ${resolvedTheme}`;
  } catch (e) {
    text = `useTheme() threw: ${(e as Error).message}`;
  }
  return <p className="j09-muted">{text}</p>;
}

export default function Playground({ impl }: { impl: ThemeToggleModule }) {
  const { ThemeProvider, default: ThemeToggle } = impl;
  return (
    <ThemeProvider storageKey="j09-playground-theme">
      <style>{DEMO_CSS}</style>
      <div className="j09-demo" style={{ maxWidth: 560 }}>
        <ThemeToggle />
        <Status impl={impl} />
        <div className="j09-card">
          <strong>Card</strong>
          <p className="j09-muted">Colours come from CSS variables switched by [data-theme] on &lt;html&gt;.</p>
        </div>
        <p className="j09-muted">Tip: with “System”, flip your OS appearance and watch this update live.</p>
      </div>
    </ThemeProvider>
  );
}
