import { useState, type ComponentType } from 'react';
import type { SortableItem, SortableListProps } from './types';

const BACKLOG: SortableItem[] = [
  { id: 'auth', label: 'Migrate auth to OAuth 2.1' },
  { id: 'search', label: 'Fix autocomplete race condition' },
  { id: 'a11y', label: 'Resolve 12 accessibility audit issues' },
  { id: 'perf', label: 'Code-split the settings page' },
  { id: 'ds', label: 'Adopt design tokens in checkout' },
  { id: 'tests', label: 'Add e2e tests for cart' },
];

export default function Playground({ impl }: { impl: { default: ComponentType<SortableListProps> } }) {
  const SortableList = impl.default;
  const [log, setLog] = useState<string[]>([]);
  return (
    <div style={{ display: 'grid', gap: 16, maxWidth: 520 }}>
      <p>
        Drag with the mouse, or Tab to a handle and press <kbd>Space</kbd>, arrows, <kbd>Space</kbd> (or{' '}
        <kbd>Escape</kbd> to cancel).
      </p>
      <SortableList
        label="Sprint backlog priority"
        items={BACKLOG}
        onReorder={(next) => setLog((l) => [next.map((i) => i.id).join(' → '), ...l].slice(0, 6))}
      />
      <section>
        <h4>onReorder calls</h4>
        <ol style={{ fontFamily: 'monospace', fontSize: 12 }}>
          {log.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ol>
      </section>
    </div>
  );
}
