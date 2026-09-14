import { useState, type ComponentType } from 'react';
import type { CellCoord, SelectableCellsProps } from './types';

export default function Playground({ impl }: { impl: { default: ComponentType<SelectableCellsProps> } }) {
  const SelectableCells = impl.default;
  const [rows, setRows] = useState(8);
  const [cols, setCols] = useState(12);
  const [last, setLast] = useState<CellCoord[]>([]);

  const summary =
    last.length === 0
      ? 'nothing'
      : `${last.length} cells, rows ${last[0].row + 1}–${last[last.length - 1].row + 1}, cols ${
          Math.min(...last.map((c) => c.col)) + 1
        }–${Math.max(...last.map((c) => c.col)) + 1}`;

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ display: 'flex', gap: 16 }}>
        <label>
          Rows <input type="number" min={1} max={50} value={rows} onChange={(e) => setRows(Number(e.target.value))} />
        </label>
        <label>
          Cols <input type="number" min={1} max={50} value={cols} onChange={(e) => setCols(Number(e.target.value))} />
        </label>
      </div>
      <p>Press on a cell and drag to select a rectangle, like a spreadsheet. Try releasing outside the grid.</p>
      <SelectableCells label="Seat map" rows={rows} cols={cols} onSelectionChange={setLast} />
      <p>
        Last committed selection: <strong>{summary}</strong>
      </p>
    </div>
  );
}
