import { useState, type ComponentType } from 'react';
import type { BarChartProps, BarDatum } from './types';

const VELOCITY: BarDatum[] = [
  { label: 'Sprint 41', value: 21 },
  { label: 'Sprint 42', value: 34 },
  { label: 'Sprint 43', value: 29 },
  { label: 'Sprint 44', value: 13 },
  { label: 'Sprint 45', value: 37 },
  { label: 'Sprint 46', value: 32 },
  { label: 'Sprint 47', value: 40 },
  { label: 'Sprint 48', value: 26 },
];

const REVENUE: BarDatum[] = [
  { label: 'Bengaluru', value: 1_240_000 },
  { label: 'Berlin', value: 860_000 },
  { label: 'London', value: 1_530_000 },
  { label: 'Singapore', value: 710_000 },
];

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', notation: 'compact' });

export default function Playground({ impl }: { impl: { default: ComponentType<BarChartProps> } }) {
  const BarChart = impl.default;
  const [width, setWidth] = useState(100);
  return (
    <div style={{ display: 'grid', gap: 32 }}>
      <label>
        Container width: {width}%{' '}
        <input type="range" min={30} max={100} value={width} onChange={(e) => setWidth(Number(e.target.value))} />
      </label>
      <div style={{ width: `${width}%` }}>
        <BarChart title="Sprint velocity (story points)" data={VELOCITY} />
      </div>
      <div style={{ width: `${width}%` }}>
        <BarChart title="Quarterly revenue by office" data={REVENUE} valueFormatter={(v) => inr.format(v)} height={240} />
      </div>
      <div style={{ width: `${width}%` }}>
        <BarChart title="Empty chart" data={[]} />
      </div>
    </div>
  );
}
