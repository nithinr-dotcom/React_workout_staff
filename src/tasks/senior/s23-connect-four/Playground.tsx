import { useState } from 'react';
import type { ConnectFourModule } from './types';

const SIZES = [
  { label: '6 × 7 (classic)', rows: 6, columns: 7 },
  { label: '5 × 6', rows: 5, columns: 6 },
  { label: '7 × 9', rows: 7, columns: 9 },
];

export default function Playground({ impl }: { impl: ConnectFourModule }) {
  const ConnectFour = impl.default;
  const [sizeIndex, setSizeIndex] = useState(0);
  const size = SIZES[sizeIndex];
  return (
    <div style={{ display: 'grid', gap: 16, maxWidth: 640 }}>
      <label>
        Board size{' '}
        <select value={sizeIndex} onChange={(e) => setSizeIndex(Number(e.target.value))}>
          {SIZES.map((s, i) => (
            <option key={s.label} value={i}>
              {s.label}
            </option>
          ))}
        </select>
      </label>
      {/* key remounts the game when the size changes */}
      <ConnectFour key={sizeIndex} rows={size.rows} columns={size.columns} />
    </div>
  );
}
