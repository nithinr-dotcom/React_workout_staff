import { useCallback, useRef, useState, type ComponentType } from 'react';
import { USERS } from '../../../mocks/data/datasets';
import type { VirtualizedListProps } from './types';

const ROW_HEIGHT = 44;

export default function Playground({ impl }: { impl: { default: ComponentType<VirtualizedListProps> } }) {
  const VirtualizedList = impl.default;
  const [count, setCount] = useState(10_000);
  const [overscan, setOverscan] = useState(3);
  const renders = useRef(0);

  // 10k rows built from the 120 mock users.
  const renderItem = useCallback((index: number) => {
    renders.current++;
    const user = USERS[index % USERS.length];
    return (
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', height: '100%', padding: '0 12px', borderBottom: '1px solid #eaecf0' }}>
        <strong style={{ width: 64, fontVariantNumeric: 'tabular-nums' }}>#{index + 1}</strong>
        <span style={{ flex: 1 }}>{user.name}</span>
        <span style={{ color: '#667085' }}>{user.role}</span>
      </div>
    );
  }, []);

  return (
    <div style={{ display: 'grid', gap: 12, maxWidth: 560 }}>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <label>
          Rows{' '}
          <select value={count} onChange={(e) => setCount(Number(e.target.value))}>
            {[0, 50, 1_000, 10_000, 100_000].map((n) => (
              <option key={n} value={n}>
                {n.toLocaleString()}
              </option>
            ))}
          </select>
        </label>
        <label>
          Overscan {overscan}{' '}
          <input type="range" min={0} max={20} value={overscan} onChange={(e) => setOverscan(Number(e.target.value))} />
        </label>
      </div>
      <VirtualizedList
        label="Employees"
        itemCount={count}
        itemHeight={ROW_HEIGHT}
        height={400}
        overscan={overscan}
        renderItem={renderItem}
      />
      <p style={{ color: '#667085', fontSize: 13 }}>
        Open DevTools and inspect the list: only a few dozen rows should be in the DOM at any time.
      </p>
    </div>
  );
}
