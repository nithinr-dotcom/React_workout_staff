import type { ComponentType } from 'react';
import type { UndoableCounterProps } from './types';

export default function Playground({ impl }: { impl: { default: ComponentType<UndoableCounterProps> } }) {
  const UndoableCounter = impl.default;
  return (
    <div style={{ display: 'grid', gap: 32, maxWidth: 480 }}>
      <section>
        <h3>Default (starts at 0)</h3>
        <UndoableCounter />
      </section>
      <section>
        <h3>initialValue=10</h3>
        <UndoableCounter initialValue={10} />
      </section>
    </div>
  );
}
