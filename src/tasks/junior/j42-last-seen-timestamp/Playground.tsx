import { useState } from 'react';
import type { LastSeenModule } from './types';

const MINUTE = 60_000;

export default function Playground({ impl }: { impl: LastSeenModule }) {
  const LastSeen = impl.default;
  // Captured once so the demo dates stay fixed while the components tick.
  const [mountedAt] = useState(() => Date.now());
  const today = new Date(mountedAt);
  const at = (daysAgo: number, h: number, m: number) =>
    new Date(today.getFullYear(), today.getMonth(), today.getDate() - daysAgo, h, m);

  const samples: { label: string; date: Date | string }[] = [
    { label: '20 seconds ago', date: new Date(mountedAt - 20_000) },
    { label: '5 minutes ago', date: new Date(mountedAt - 5 * MINUTE) },
    { label: '59 minutes ago', date: new Date(mountedAt - 59 * MINUTE) },
    { label: 'Today 00:01', date: at(0, 0, 1) },
    { label: 'Yesterday 09:10', date: at(1, 9, 10) },
    { label: '10 days ago', date: at(10, 18, 0) },
    { label: 'Two years ago', date: at(730, 12, 0) },
    { label: 'In 5 minutes (clock skew)', date: new Date(mountedAt + 5 * MINUTE) },
    { label: 'Invalid', date: 'not a date' },
  ];

  let pureError: string | null = null;
  try {
    impl.formatLastSeen(new Date(mountedAt), mountedAt);
  } catch (e) {
    pureError = (e as Error).message;
  }

  return (
    <div style={{ display: 'grid', gap: 16, maxWidth: 560 }}>
      {pureError && <p style={{ color: '#b91c1c' }}>Error: {pureError}</p>}
      <table>
        <tbody>
          {samples.map((s) => (
            <tr key={s.label}>
              <th style={{ textAlign: 'left', paddingRight: 16 }}>{s.label}</th>
              <td>{pureError ? null : <LastSeen date={s.date} />}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>Leave this open: the minute-based rows update once a minute, without a per-second timer.</p>
    </div>
  );
}
