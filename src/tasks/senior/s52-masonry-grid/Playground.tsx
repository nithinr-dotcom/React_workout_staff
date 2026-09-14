import { useCallback, useState } from 'react';
import type { MasonryModule, Photo } from './types';

const SIZES: [number, number][] = [
  [400, 600],
  [600, 400],
  [400, 400],
  [400, 700],
  [600, 300],
  [400, 500],
  [500, 800],
  [800, 500],
];

const SUBJECTS = ['Mountain', 'Lake', 'Street', 'Forest', 'Desert', 'City', 'Coast', 'Meadow', 'Canyon', 'Harbour'];

function makePage(start: number, count: number): Photo[] {
  return Array.from({ length: count }, (_, k) => {
    const i = start + k;
    const [width, height] = SIZES[(i * 7) % SIZES.length];
    return {
      id: `p${i}`,
      width,
      height,
      src: `https://picsum.photos/seed/masonry-${i}/${width}/${height}`,
      alt: `${SUBJECTS[i % SUBJECTS.length]} photo ${i + 1}`,
    };
  });
}

const PAGE = 20;
const MAX = 120;

export default function Playground({ impl }: { impl: MasonryModule }) {
  const Masonry = impl.default;
  const [items, setItems] = useState<Photo[]>(() => makePage(0, PAGE));
  const [minColumnWidth, setMinColumnWidth] = useState(180);
  const [gap, setGap] = useState(12);
  const [loading, setLoading] = useState(false);

  const loadMore = useCallback(() => {
    setLoading(true);
    setTimeout(() => {
      setItems((prev) => [...prev, ...makePage(prev.length, PAGE)]);
      setLoading(false);
    }, 600);
  }, []);

  let pureDemo: string;
  try {
    pureDemo = JSON.stringify(
      impl.computeMasonry(
        [
          { id: 'a', width: 100, height: 150 },
          { id: 'b', width: 100, height: 100 },
          { id: 'c', width: 100, height: 50 },
          { id: 'd', width: 100, height: 100 },
        ],
        3,
        100,
        10,
      ).map((p) => `${p.id}@c${p.column}(${p.x},${p.y})`),
    );
  } catch (e) {
    pureDemo = `Error: ${(e as Error).message}`;
  }

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <label>
          minColumnWidth: {minColumnWidth}px{' '}
          <input type="range" min={120} max={320} step={10} value={minColumnWidth} onChange={(e) => setMinColumnWidth(Number(e.target.value))} />
        </label>
        <label>
          gap: {gap}px <input type="range" min={0} max={32} step={2} value={gap} onChange={(e) => setGap(Number(e.target.value))} />
        </label>
        <span>
          {items.length} photos{loading ? ' · loading…' : ''}
        </span>
      </div>
      <p style={{ fontFamily: 'monospace', fontSize: 12, margin: 0 }}>computeMasonry(4 items, 3 cols, 100px, gap 10) → {pureDemo}</p>
      <p style={{ margin: 0 }}>Resize the window (or drag the panel) to change the column count. Scroll down to load more.</p>
      <Masonry
        items={items}
        minColumnWidth={minColumnWidth}
        gap={gap}
        hasMore={!loading && items.length < MAX}
        onLoadMore={loadMore}
      />
    </div>
  );
}
