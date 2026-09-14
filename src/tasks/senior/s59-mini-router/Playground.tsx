import { useEffect, useMemo, useRef, useState } from 'react';
import type { MiniRouterModule } from './types';

const USERS: Record<string, string> = { '1': 'Ada Lovelace', '2': 'Linus Torvalds', '3': 'Grace Hopper' };

export default function Playground({ impl }: { impl: MiniRouterModule }) {
  const [enabled, setEnabled] = useState(false);
  const originalUrl = useRef(window.location.href);

  // The demo drives the real address bar. Put the lab's own URL back when the demo is turned off or unmounted.
  useEffect(() => {
    if (!enabled) return;
    const original = originalUrl.current;
    window.history.replaceState(null, '', '/');
    return () => {
      window.history.replaceState(null, '', original);
    };
  }, [enabled]);

  return (
    <div style={{ fontFamily: 'system-ui', display: 'grid', gap: 12, maxWidth: 640 }}>
      <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
        Run the demo (it changes the real address bar)
      </label>
      <p style={{ margin: 0, color: '#667085', fontSize: 13 }}>
        The lab itself runs on react-router, which also listens for <code>popstate</code>. While the demo is on,
        avoid the browser Back / Forward buttons: they would navigate the lab, not just your router. Back/forward
        behaviour is covered by the tests (<code>npm test -- s59</code>). Turning the demo off restores the lab URL.
      </p>
      {enabled && <Demo impl={impl} />}
    </div>
  );
}

function UrlBar() {
  const [url, setUrl] = useState(() => window.location.pathname + window.location.search);
  useEffect(() => {
    const tick = window.setInterval(() => setUrl(window.location.pathname + window.location.search), 200);
    return () => window.clearInterval(tick);
  }, []);
  return <code style={{ background: '#f2f4f7', padding: '2px 6px', borderRadius: 4 }}>{url}</code>;
}

function Demo({ impl }: { impl: MiniRouterModule }) {
  const { Router, Routes, Route, Link } = impl;
  // Created once per implementation so route elements keep a stable component type.
  const UserPage = useMemo(() => makeUserPage(impl), [impl]);

  return (
    <div style={{ border: '1px solid #d0d5dd', borderRadius: 8, padding: 12 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
        <span>URL:</span>
        <UrlBar />
      </div>
      <Router>
        <nav style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Link to="/">Home</Link>
          {Object.entries(USERS).map(([id, name]) => (
            <Link key={id} to={`/users/${id}`}>
              {name}
            </Link>
          ))}
          <Link to="/users/99">Missing user</Link>
          <Link to="/nowhere">Broken link</Link>
          <Link to="/users/1" target="_blank">
            Ada (new tab, not intercepted)
          </Link>
        </nav>
        <main style={{ marginTop: 12 }}>
          <Routes>
            <Route path="/" element={<h2>Home. Pick a user. Try Cmd/Ctrl-click too.</h2>} />
            <Route path="/users/:id" element={<UserPage />} />
            <Route path="*" element={<h2>404: Not found</h2>} />
          </Routes>
        </main>
      </Router>
    </div>
  );
}

function makeUserPage({ useParams, useNavigate }: MiniRouterModule) {
  return function UserPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const name = USERS[id ?? ''];
    if (!name) return <h2>No user with id {id}</h2>;
    return (
      <>
        <h2>{name}</h2>
        <p>
          <code>useParams()</code> → <code>{JSON.stringify({ id })}</code>
        </p>
        <button type="button" onClick={() => navigate('/', { replace: true })}>
          navigate(&apos;/&apos;, {'{'} replace: true {'}'})
        </button>
      </>
    );
  };
}
