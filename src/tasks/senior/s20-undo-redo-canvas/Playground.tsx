import { useState, type ComponentType } from 'react';
import type { DrawingCanvasProps, Stroke } from './types';

const SMILE: Stroke[] = [
  {
    id: 'seed-1',
    color: '#2563eb',
    size: 4,
    points: Array.from({ length: 25 }, (_, i) => {
      const a = Math.PI * 0.15 + (Math.PI * 0.7 * i) / 24;
      return { x: 300 + Math.cos(a) * 80, y: 180 + Math.sin(a) * 80 };
    }),
  },
  { id: 'seed-2', color: '#111827', size: 16, points: [{ x: 260, y: 150 }] },
  { id: 'seed-3', color: '#111827', size: 16, points: [{ x: 340, y: 150 }] },
];

export default function Playground({ impl }: { impl: { default: ComponentType<DrawingCanvasProps> } }) {
  const DrawingCanvas = impl.default;
  const [seeded, setSeeded] = useState(false);
  const [strokes, setStrokes] = useState<Stroke[]>([]);

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <label>
        <input
          type="checkbox"
          checked={seeded}
          onChange={(e) => {
            setSeeded(e.target.checked);
            setStrokes([]);
          }}
        />{' '}
        Start from initialStrokes (a smiley)
      </label>
      <DrawingCanvas key={String(seeded)} initialStrokes={seeded ? SMILE : []} onChange={setStrokes} />
      <details>
        <summary>
          onChange: {strokes.length} strokes, {strokes.reduce((n, s) => n + s.points.length, 0)} points
        </summary>
        <pre style={{ maxHeight: 240, overflow: 'auto', fontSize: 12 }}>
          {JSON.stringify(
            strokes.map((s) => ({ ...s, points: `${s.points.length} points` })),
            null,
            2,
          )}
        </pre>
      </details>
    </div>
  );
}
