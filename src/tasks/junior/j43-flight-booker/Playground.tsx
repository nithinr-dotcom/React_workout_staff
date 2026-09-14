import type { ComponentType } from 'react';
import type { FlightBookerProps } from './types';

export default function Playground({ impl }: { impl: { default: ComponentType<FlightBookerProps> } }) {
  const FlightBooker = impl.default;
  return (
    <div style={{ display: 'grid', gap: 32, maxWidth: 420 }}>
      <section>
        <h3>Default (today = this device&apos;s local date)</h3>
        <FlightBooker />
      </section>
      <section>
        <h3>today=&quot;2030-02-27&quot; (try a return flight across the end of February)</h3>
        <FlightBooker today="2030-02-27" />
      </section>
    </div>
  );
}
