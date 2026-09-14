import type { ComponentType } from 'react';
import type { MortgageCalculatorProps } from './types';

export default function Playground({ impl }: { impl: { default: ComponentType<MortgageCalculatorProps> } }) {
  const MortgageCalculator = impl.default;
  return (
    <div style={{ display: 'grid', gap: 24, maxWidth: 560 }}>
      <section>
        <h3>Default (USD, en-US)</h3>
        <MortgageCalculator />
      </section>
      <section>
        <h3>INR, en-IN</h3>
        <MortgageCalculator currency="INR" locale="en-IN" />
      </section>
    </div>
  );
}
