import { useState, type ComponentType } from 'react';
import { createFakeApi } from './data';
import type { TeamDirectoryProps } from './types';

export default function Playground({ impl }: { impl: { default: ComponentType<TeamDirectoryProps> } }) {
  const TeamDirectory = impl.default;
  const [api] = useState(() => createFakeApi());
  const [mounted, setMounted] = useState(true);
  const [session, setSession] = useState(0);

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
        <button type="button" onClick={() => setMounted((m) => !m)}>
          {mounted ? 'Unmount app' : 'Mount app'}
        </button>
        <button type="button" onClick={() => setSession((s) => s + 1)}>
          Remount (fresh state)
        </button>
      </div>
      <p style={{ margin: 0, color: '#667085', fontSize: 13 }}>
        Repro tips: Ada Lovelace&apos;s profile takes 2s to load, everyone else takes 300ms. Open DevTools to watch for
        leaks when you unmount.
      </p>
      {mounted && <TeamDirectory key={session} api={api} />}
    </div>
  );
}
