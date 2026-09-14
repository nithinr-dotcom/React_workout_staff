import { useEffect, useRef, useState, type ComponentType } from 'react';
import { __resetMockDb, deleteUser, getAllUsers, saveUser } from '../../../mocks/api';
import type { UsersApi, UsersDirectoryProps } from './types';

interface Knobs {
  failRate: number;
  slow: boolean;
}

export default function Playground({ impl }: { impl: { default: ComponentType<UsersDirectoryProps> } }) {
  const UsersDirectory = impl.default;
  const [failRate, setFailRate] = useState(0);
  const [slow, setSlow] = useState(false);
  const [session, setSession] = useState(0);

  // Knobs are read at call time, so the api object stays stable and changing a knob doesn't trigger a refetch.
  const knobs = useRef<Knobs>({ failRate, slow });
  useEffect(() => {
    knobs.current = { failRate, slow };
  }, [failRate, slow]);

  const [api] = useState<UsersApi>(() => {
    const opts = () => ({
      latency: (knobs.current.slow ? [1200, 2000] : [200, 600]) as [number, number],
      failRate: knobs.current.failRate,
    });
    return {
      getAllUsers: (options) => getAllUsers({ ...opts(), ...options }),
      saveUser: (user, options) => saveUser(user, { ...opts(), ...options }),
      deleteUser: (id, options) => deleteUser(id, { ...opts(), ...options }),
    };
  });

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center' }}>
        <label>
          Failure rate{' '}
          <select value={failRate} onChange={(e) => setFailRate(Number(e.target.value))}>
            <option value={0}>0%</option>
            <option value={0.3}>30%</option>
            <option value={1}>100%</option>
          </select>
        </label>
        <label>
          <input type="checkbox" checked={slow} onChange={(e) => setSlow(e.target.checked)} /> Slow network
        </label>
        <button
          type="button"
          onClick={() => {
            __resetMockDb();
            setSession((s) => s + 1);
          }}
        >
          Reset data &amp; remount
        </button>
      </div>
      <p style={{ margin: 0, color: '#667085', fontSize: 13 }}>
        Tip: once the list has loaded, set the failure rate to 100% and delete a user to see the rollback.
      </p>
      <UsersDirectory key={session} api={api} />
    </div>
  );
}
